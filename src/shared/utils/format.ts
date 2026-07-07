// Định dạng số nguyên với dấu chấm phân cách hàng nghìn kiểu VN: 1792000 -> "1.792.000".
export function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Định dạng số điện thoại E.164 sang hiển thị: "+84969668834" -> "+84 969668834".
export function formatPhone(phone: string): string {
  if (phone.startsWith('+84')) return `+84 ${phone.slice(3)}`;
  return phone;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// ISO -> "04/07/2026"
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ISO -> "21:30"
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
