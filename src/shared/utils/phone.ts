// Chuẩn hoá SĐT Việt Nam về định dạng E.164 mà backend yêu cầu: "+84xxxxxxxxx".
// Bỏ mọi ký tự không phải số, bỏ số 0 đầu (vì đã có +84).
export function toE164Vn(input: string): string {
  const digits = input.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return `+84${digits}`;
}
