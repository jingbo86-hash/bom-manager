import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui 的 cn utility */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 数字转中文大写金额（如 1234.56 → "壹仟贰佰叁拾肆元伍角陆分"） */
export function numberToChinese(n: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
  const isNegative = n < 0;
  n = Math.abs(n);

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);

  if (intPart === 0 && decPart === 0) return '零元整';

  let result = '';

  if (intPart > 0) {
    const intStr = String(intPart);
    const len = intStr.length;
    let zeroFlag = false;

    for (let i = 0; i < len; i++) {
      const p = len - 1 - i;
      const d = parseInt(intStr[i]);
      const unit = units[p];

      if (d === 0) {
        zeroFlag = true;
        if (p === 4 || p === 8) {
          result += unit;
          zeroFlag = false;
        }
      } else {
        if (zeroFlag) {
          result += '零';
          zeroFlag = false;
        }
        result += digits[d] + unit;
      }
    }
    result += '元';
  }

  if (decPart > 0) {
    const jiao = Math.floor(decPart / 10);
    const fen = decPart % 10;

    if (jiao > 0) {
      result += digits[jiao] + '角';
    } else if (intPart > 0) {
      result += '零';
    }

    if (fen > 0) {
      result += digits[fen] + '分';
    }
  } else {
    result += '整';
  }

  return (isNegative ? '负' : '') + result;
}

/** 生成唯一ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** 格式化金额 */
export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 格式化百分比 */
export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

/** 格式化日期 */
export function formatDate(date: number): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/** 截断文本 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}