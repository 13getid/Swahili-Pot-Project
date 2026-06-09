'use strict';

const pool = require('../db/pool');

const dstr = (v) => (v ? new Date(v).toDateString() : 'N/A');

// Kenya is UTC+3 year-round (no DST). Shift the UTC instant so getUTC* reads EAT.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const toEat = (v) => new Date(new Date(v).getTime() + EAT_OFFSET_MS);
const ymd = (eat) =>
  `${eat.getUTCFullYear()}-${String(eat.getUTCMonth() + 1).padStart(2, '0')}-${String(eat.getUTCDate()).padStart(2, '0')}`;
const hm = (eat) =>
  `${String(eat.getUTCHours()).padStart(2, '0')}:${String(eat.getUTCMinutes()).padStart(2, '0')}`;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Summarise an attachee's daily check-ins (the click-to-check-in records, NOT
 * the trainee QR system). Everything is computed from real timestamps.
 */
function analyseCheckins(rows, nowMs) {
  const total = rows.length;
  if (total === 0) return { total: 0 };

  const dayset = new Set();
  const dowCounts = Array(7).fill(0);
  const arrivalMins = [];
  const durations = [];
  let before9 = 0;
  for (const r of rows) {
    const eatIn = toEat(r.check_in);
    dayset.add(ymd(eatIn));
    dowCounts[eatIn.getUTCDay()] += 1;
    arrivalMins.push(eatIn.getUTCHours() * 60 + eatIn.getUTCMinutes());
    if (eatIn.getUTCHours() < 9) before9 += 1;
    if (r.check_out) {
      const dur = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
      if (dur > 0 && dur < 24 * 60) durations.push(dur);
    }
  }
  const minsToHm = (mins) => {
    const t = Math.round(mins);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  const avgArrival = arrivalMins.reduce((a, b) => a + b, 0) / arrivalMins.length;
  const lastMs = new Date(rows[rows.length - 1].check_in).getTime();
  return {
    total,
    distinctDays: dayset.size,
    avgArrival: minsToHm(avgArrival),
    pctBefore9: Math.round((before9 / total) * 100),
    avgDuration: durations.length ? minsToHm(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    daysSinceLast: Math.floor((nowMs - lastMs) / 86400000),
    firstSeen: rows[0].check_in,
    lastSeen: rows[rows.length - 1].check_in,
    dow: DOW.map((name, i) => ({ name, count: dowCounts[i] })).filter((d) => d.count > 0),
  };
}

/**
 * Build a data-dense context for ONE attachee (a users row with role
 * 'attachee'), extended by attachee_profiles. The AI sees only this string.
 */
async function buildAttacheeContext(attacheeId, departmentId) {
  const profRes = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at AS account_created,
            ap.university_name, ap.course_of_study, ap.student_id_number,
            ap.attachment_start_date, ap.attachment_end_date,
            d.name AS department_name,
            sup.name AS supervisor_name, inst.name AS instructor_name
       FROM users u
       LEFT JOIN attachee_profiles ap ON ap.user_id = u.id
       JOIN departments d ON d.id = u.department_id
       LEFT JOIN users sup ON sup.id = ap.supervisor_id
       LEFT JOIN users inst ON inst.id = ap.instructor_id
      WHERE u.id = $1 AND u.role = 'attachee' AND u.department_id = $2`,
    [attacheeId, departmentId]
  );
  if (!profRes.rows.length) throw new Error('Attachee not found');
  const a = profRes.rows[0];

  const [checkinRes, taskRes, commentRes, programRes, sessionRes] = await Promise.all([
    pool.query(
      `SELECT check_in, check_out FROM attachee_checkins
        WHERE attachee_id = $1 ORDER BY check_in ASC LIMIT 1000`,
      [attacheeId]
    ),
    pool.query(
      `SELECT t.title, t.description, t.status, t.priority, t.due_date,
              t.created_at AS assigned_at, t.updated_at,
              b.name AS assigned_by
         FROM tasks t JOIN users b ON b.id = t.assigned_by
        WHERE t.assigned_to = $1
        ORDER BY t.created_at DESC LIMIT 50`,
      [attacheeId]
    ),
    pool.query(
      `SELECT tc.body, tc.is_general_note, tc.created_at, u.name AS author_name, u.role AS author_role
         FROM task_comments tc
         JOIN users u ON u.id = tc.author_id
         LEFT JOIN tasks t ON t.id = tc.task_id
        WHERE (tc.attachee_id = $1 OR t.assigned_to = $1)
          AND u.role IN ('instructor','supervisor')
        ORDER BY tc.created_at DESC LIMIT 30`,
      [attacheeId]
    ),
    pool.query(
      `SELECT p.name, p.start_date, p.end_date
         FROM attachee_program_enrollments ape JOIN programs p ON p.id = ape.program_id
        WHERE ape.attachee_id = $1 ORDER BY ape.enrolled_at DESC`,
      [attacheeId]
    ),
    pool.query(
      `SELECT sl.session_date, sl.topics_covered, sl.challenges, u.name AS instructor_name
         FROM session_logs sl JOIN users u ON u.id = sl.instructor_id
        WHERE sl.department_id = $1
          AND (LOWER(sl.topics_covered) LIKE LOWER($2) OR LOWER(sl.challenges) LIKE LOWER($2))
        ORDER BY sl.session_date DESC LIMIT 15`,
      [departmentId, `%${a.name.split(' ')[0]}%`]
    ),
  ]);

  const nowMs = Date.now();
  const ci = analyseCheckins(checkinRes.rows, nowMs);
  const tasks = taskRes.rows;
  const total = tasks.length;
  const submitted = tasks.filter((t) => ['submitted', 'reviewed', 'completed'].includes(t.status)).length;
  const reviewed = tasks.filter((t) => ['reviewed', 'completed'].includes(t.status)).length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => ['open', 'pending'].includes(t.status)).length;
  const completionRate = total ? Math.round((submitted / total) * 100) : 0;

  // Attachment timeline
  let timeline = 'Attachment dates not set.';
  if (a.attachment_start_date && a.attachment_end_date) {
    const start = new Date(a.attachment_start_date);
    const end = new Date(a.attachment_end_date);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed = Math.max(0, Math.round((Date.now() - start) / 86400000));
    const remaining = Math.max(0, Math.round((end - Date.now()) / 86400000));
    const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
    timeline = `Start ${dstr(a.attachment_start_date)} → End ${dstr(a.attachment_end_date)} | ${totalDays} days total, ${elapsed} elapsed (${pct}%), ${remaining} remaining`;
  }

  const lines = [];
  lines.push('=== ATTACHEE PROFILE ===');
  lines.push(`Name: ${a.name}`);
  lines.push(`Email: ${a.email} | Phone: ${a.phone || 'Not provided'}`);
  lines.push(`Department: ${a.department_name}`);
  lines.push(`University: ${a.university_name || 'Not provided'}`);
  lines.push(`Course of Study: ${a.course_of_study || 'Not provided'}`);
  lines.push(`Student ID: ${a.student_id_number || 'Not provided'}`);
  lines.push(`Supervisor: ${a.supervisor_name || 'Not assigned'} | Instructor: ${a.instructor_name || 'Not assigned'}`);
  lines.push(`Status: ${a.is_active ? 'Active' : 'Inactive'}`);

  lines.push('\n=== ATTACHMENT PERIOD ===');
  lines.push(timeline);

  lines.push('\n=== ATTENDANCE (daily click check-ins) ===');
  if (ci.total === 0) {
    lines.push('No check-ins recorded yet.');
  } else {
    lines.push(`Total check-ins: ${ci.total} across ${ci.distinctDays} distinct days`);
    lines.push(`Average arrival: ${ci.avgArrival} EAT | Arrived before 09:00: ${ci.pctBefore9}% of days`);
    lines.push(`Average time on site: ${ci.avgDuration || 'N/A'} | Days since last check-in: ${ci.daysSinceLast}`);
    lines.push(`Active span: ${dstr(ci.firstSeen)} → ${dstr(ci.lastSeen)}`);
    lines.push(`Day-of-week pattern: ${ci.dow.map((d) => `${d.name.slice(0, 3)} ${d.count}`).join(', ')}`);
  }

  lines.push('\n=== TASK PERFORMANCE ===');
  lines.push(`Total tasks: ${total} | Pending: ${pending} | In progress: ${inProgress} | Submitted: ${submitted} | Reviewed: ${reviewed}`);
  lines.push(`Completion rate: ${completionRate}%`);
  if (tasks.length) {
    lines.push('\nTask details (most recent 20):');
    tasks.slice(0, 20).forEach((t, i) => {
      lines.push(`[${i + 1}] "${t.title}" — ${t.status} (priority ${t.priority}) — assigned by ${t.assigned_by}`);
      if (t.description) lines.push(`    ${t.description.slice(0, 180)}`);
      if (t.due_date) lines.push(`    Due: ${dstr(t.due_date)}`);
    });
  }

  if (commentRes.rows.length) {
    lines.push('\n=== INSTRUCTOR / SUPERVISOR NOTES ===');
    commentRes.rows.forEach((c, i) => {
      lines.push(`[${i + 1}] ${c.author_name} (${c.author_role})${c.is_general_note ? ' [general]' : ''}: "${c.body.slice(0, 240)}"`);
    });
  }

  if (programRes.rows.length) {
    lines.push('\n=== PROGRAMME ENROLMENT ===');
    programRes.rows.forEach((p) => lines.push(`• ${p.name} (${dstr(p.start_date)} → ${p.end_date ? dstr(p.end_date) : 'ongoing'})`));
  }

  if (sessionRes.rows.length) {
    lines.push('\n=== SESSION LOG MENTIONS ===');
    sessionRes.rows.forEach((s, i) => {
      lines.push(`[${i + 1}] ${dstr(s.session_date)} — ${s.instructor_name}`);
      if (s.topics_covered) lines.push(`    Topics: ${s.topics_covered.slice(0, 240)}`);
      if (s.challenges) lines.push(`    Challenges: ${s.challenges.slice(0, 240)}`);
    });
  }

  lines.push('\nNOTE: Base every assessment on the data above (attachment period, check-ins, tasks, feedback, notes). Do not invent outcomes that are not shown.');
  return lines.join('\n');
}

/**
 * Department-level context for the supervisor AI assistant — attachees (users),
 * their task activity, plus department submission/task statistics.
 */
async function buildDepartmentContext(departmentId) {
  const [deptRes, attacheeRes, subStatsRes, taskStatsRes, recentRes] = await Promise.all([
    pool.query('SELECT name FROM departments WHERE id = $1', [departmentId]),
    pool.query(
      `SELECT u.id, u.name, ap.university_name, ap.course_of_study,
              ap.attachment_start_date, ap.attachment_end_date,
              COUNT(t.id)::int AS tasks_assigned,
              COUNT(t.id) FILTER (WHERE t.status IN ('submitted','reviewed','completed'))::int AS tasks_submitted
         FROM users u
         LEFT JOIN attachee_profiles ap ON ap.user_id = u.id
         LEFT JOIN tasks t ON t.assigned_to = u.id
        WHERE u.role = 'attachee' AND u.department_id = $1 AND u.is_active = true
        GROUP BY u.id, u.name, ap.university_name, ap.course_of_study, ap.attachment_start_date, ap.attachment_end_date
        ORDER BY u.name ASC`,
      [departmentId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
              COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
              COUNT(*) FILTER (WHERE status = 'returned')::int AS returned
         FROM form_submissions WHERE department_id = $1`,
      [departmentId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('open','pending'))::int AS open,
              COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
              COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
              COUNT(*) FILTER (WHERE status IN ('reviewed','completed'))::int AS done
         FROM tasks WHERE department_id = $1`,
      [departmentId]
    ),
    pool.query(
      `SELECT t.title, t.status, t.created_at, a.name AS attachee_name, b.name AS assigned_by
         FROM tasks t JOIN users a ON a.id = t.assigned_to JOIN users b ON b.id = t.assigned_by
        WHERE t.department_id = $1
        ORDER BY t.created_at DESC LIMIT 10`,
      [departmentId]
    ),
  ]);

  const dept = deptRes.rows[0];
  const attachees = attacheeRes.rows;
  const subs = subStatsRes.rows[0];
  const tasks = taskStatsRes.rows[0];

  const lines = [];
  lines.push(`DEPARTMENT: ${dept?.name || 'Unknown'}`);
  lines.push(`Active attachees: ${attachees.length}`);
  lines.push('\nATTACHEE OVERVIEW');
  lines.push('=================');
  if (attachees.length) {
    attachees.forEach((a) => {
      const daysLeft = a.attachment_end_date
        ? Math.max(0, Math.round((new Date(a.attachment_end_date) - Date.now()) / 86400000))
        : null;
      const rate = a.tasks_assigned ? Math.round((a.tasks_submitted / a.tasks_assigned) * 100) : 0;
      lines.push(
        `• ${a.name}${a.university_name ? ` (${a.university_name}, ${a.course_of_study || '—'})` : ''} — ` +
          `${a.tasks_submitted}/${a.tasks_assigned} tasks submitted (${rate}%)` +
          (daysLeft != null ? `, ${daysLeft} days remaining` : '')
      );
    });
  } else {
    lines.push('No active attachees.');
  }

  lines.push('\nDEPARTMENT TASK STATISTICS');
  lines.push('==========================');
  lines.push(`Total: ${tasks.total} | Open: ${tasks.open} | In progress: ${tasks.in_progress} | Submitted: ${tasks.submitted} | Reviewed/Done: ${tasks.done}`);

  lines.push('\nDEPARTMENT SUBMISSION STATISTICS');
  lines.push('================================');
  lines.push(`Total: ${subs.total} | Submitted: ${subs.submitted} | Acknowledged: ${subs.acknowledged} | Returned: ${subs.returned}`);

  lines.push('\nRECENT TASK ACTIVITY');
  lines.push('====================');
  if (recentRes.rows.length) {
    recentRes.rows.forEach((r) => lines.push(`[${dstr(r.created_at)}] ${r.assigned_by} → ${r.attachee_name}: "${r.title}" (${r.status})`));
  } else {
    lines.push('No tasks yet.');
  }

  return lines.join('\n');
}

module.exports = { buildAttacheeContext, buildDepartmentContext };
