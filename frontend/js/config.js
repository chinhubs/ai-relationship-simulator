const CONFIG = {
  API_BASE: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : "/api/v1",
};

// Sim day 1 = Sunday 5 January 2025 (= 5 มกราคม 2568 BE)
const SIM_START_DATE = new Date(2025, 0, 5);

const _MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const _MONTHS_FULL  = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const _DOW_SHORT    = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];
const _DOW_FULL     = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];

/**
 * Convert sim_day (1-based integer) to a real calendar date.
 * Returns { d, monthShort, monthFull, yearBE, dowShort, dowFull }
 */
function simDayToDate(simDay) {
  const ms   = SIM_START_DATE.getTime() + (simDay - 1) * 86400000;
  const date = new Date(ms);
  const dow  = date.getDay(); // 0=Sun, 6=Sat
  return {
    d:          date.getDate(),
    monthShort: _MONTHS_SHORT[date.getMonth()],
    monthFull:  _MONTHS_FULL[date.getMonth()],
    yearBE:     date.getFullYear() + 543,
    dowShort:   _DOW_SHORT[dow],
    dowFull:    _DOW_FULL[dow],
  };
}
