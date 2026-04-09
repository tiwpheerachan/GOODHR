const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = 'https://kqlumdrkoopykmmylnhf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Helper function to format Thai date
function formatThaiDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric', locale: 'th-TH' };
  return new Intl.DateTimeFormat('th-TH', options).format(date);
}

// Helper function to format time (HH:MM)
function formatTime(timeString) {
  if (!timeString) return 'N/A';
  return timeString.substring(0, 5);
}

// Main query function
async function queryEmployee() {
  try {
    console.log('='.repeat(80));
    console.log('GOODHR EMPLOYEE QUERY - Employee Code: 68100004');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Find employee by code
    console.log('Step 1: Finding employee...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name_th, last_name_th, nickname, employee_code, department, position, company_id, hire_date, shift_id')
      .eq('employee_code', '68100004')
      .single();

    if (empError) {
      console.error('Error finding employee:', empError);
      return;
    }

    if (!employees) {
      console.log('Employee with code 68100004 not found');
      return;
    }

    const employeeId = employees.id;
    const companyId = employees.company_id;

    console.log('✓ Employee found: ID =', employeeId);
    console.log();

    // Step 2: Get employee basic info with shift template
    console.log('Step 2: Employee Basic Information');
    console.log('-'.repeat(80));

    let shiftInfo = 'N/A';
    if (employees.shift_id) {
      const { data: shift } = await supabase
        .from('shift_templates')
        .select('work_start, work_end')
        .eq('id', employees.shift_id)
        .single();
      if (shift) {
        shiftInfo = `${formatTime(shift.work_start)} - ${formatTime(shift.work_end)}`;
      }
    }

    console.log(`Full Name: ${employees.first_name_th} ${employees.last_name_th}`);
    console.log(`Nickname: ${employees.nickname || 'N/A'}`);
    console.log(`Employee Code: ${employees.employee_code}`);
    console.log(`Department: ${employees.department || 'N/A'}`);
    console.log(`Position: ${employees.position || 'N/A'}`);
    console.log(`Company ID: ${companyId}`);
    console.log(`Hire Date: ${formatThaiDate(employees.hire_date)}`);
    console.log(`Shift Template: ${shiftInfo}`);
    console.log();

    // Step 3: Get attendance records for March and April 2026
    console.log('Step 3: Attendance Records (March - April 2026)');
    console.log('-'.repeat(80));

    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('work_date, clock_in, clock_out, status, late_minutes, early_out_minutes, ot_minutes, work_minutes')
      .eq('employee_id', employeeId)
      .gte('work_date', '2026-03-01')
      .lte('work_date', '2026-04-30')
      .order('work_date', { ascending: true });

    if (attError) {
      console.error('Error fetching attendance:', attError);
    } else if (attendance && attendance.length > 0) {
      console.log(`Found ${attendance.length} attendance records:`);
      console.log();
      attendance.forEach(record => {
        console.log(`Date: ${formatThaiDate(record.work_date)}`);
        console.log(`  Clock In: ${formatTime(record.clock_in)}, Clock Out: ${formatTime(record.clock_out)}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Late: ${record.late_minutes || 0} min, Early Out: ${record.early_out_minutes || 0} min`);
        console.log(`  OT: ${record.ot_minutes || 0} min, Work: ${record.work_minutes || 0} min`);
        console.log();
      });
    } else {
      console.log('No attendance records found for March-April 2026');
      console.log();
    }

    // Step 4: Get overtime requests
    console.log('Step 4: Overtime Requests (All)');
    console.log('-'.repeat(80));

    const { data: otRequests, error: otError } = await supabase
      .from('ot_requests')
      .select('work_date, ot_start, ot_end, status, reason')
      .eq('employee_id', employeeId)
      .order('work_date', { ascending: false });

    if (otError) {
      console.error('Error fetching OT requests:', otError);
    } else if (otRequests && otRequests.length > 0) {
      console.log(`Found ${otRequests.length} overtime requests:`);
      console.log();
      otRequests.forEach(record => {
        console.log(`Date: ${formatThaiDate(record.work_date)}`);
        console.log(`  Time: ${formatTime(record.ot_start)} - ${formatTime(record.ot_end)}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Reason: ${record.reason || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('No overtime requests found');
      console.log();
    }

    // Step 5: Get time adjustment requests
    console.log('Step 5: Time Adjustment Requests (All)');
    console.log('-'.repeat(80));

    const { data: timeAdj, error: timeAdjError } = await supabase
      .from('time_adjustments')
      .select('work_date, status, reason')
      .eq('employee_id', employeeId)
      .order('work_date', { ascending: false });

    if (timeAdjError) {
      console.error('Error fetching time adjustments:', timeAdjError);
    } else if (timeAdj && timeAdj.length > 0) {
      console.log(`Found ${timeAdj.length} time adjustment requests:`);
      console.log();
      timeAdj.forEach(record => {
        console.log(`Date: ${formatThaiDate(record.work_date)}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Reason: ${record.reason || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('No time adjustment requests found');
      console.log();
    }

    // Step 6: Get leave requests
    console.log('Step 6: Leave Requests (All)');
    console.log('-'.repeat(80));

    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select('start_date, end_date, status, leave_type_id, total_days')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (leaveError) {
      console.error('Error fetching leave requests:', leaveError);
    } else if (leaveRequests && leaveRequests.length > 0) {
      // Get leave type names
      const leaveTypeIds = [...new Set(leaveRequests.map(r => r.leave_type_id))];
      const { data: leaveTypes } = await supabase
        .from('leave_types')
        .select('id, name')
        .in('id', leaveTypeIds);

      const leaveTypeMap = {};
      if (leaveTypes) {
        leaveTypes.forEach(lt => {
          leaveTypeMap[lt.id] = lt.name;
        });
      }

      console.log(`Found ${leaveRequests.length} leave requests:`);
      console.log();
      leaveRequests.forEach(record => {
        const leaveTypeName = leaveTypeMap[record.leave_type_id] || 'Unknown';
        console.log(`Period: ${formatThaiDate(record.start_date)} to ${formatThaiDate(record.end_date)}`);
        console.log(`  Leave Type: ${leaveTypeName}`);
        console.log(`  Total Days: ${record.total_days}`);
        console.log(`  Status: ${record.status}`);
        console.log();
      });
    } else {
      console.log('No leave requests found');
      console.log();
    }

    console.log('='.repeat(80));
    console.log('Query completed successfully');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the query
queryEmployee();
