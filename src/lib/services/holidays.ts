import Holidays from "date-holidays";

export interface MarketHolidayStatus {
  kr: {
    isHoliday: boolean;
    holidayName?: string;
  };
  us: {
    isHoliday: boolean;
    holidayName?: string;
  };
}

// 한국 시간 가져오기
function getKoreanDate(): Date {
  const now = new Date();
  const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return koreanTime;
}

// 미국 동부 시간 가져오기 (NYSE 기준)
function getUSEasternDate(): Date {
  const now = new Date();
  // EDT: UTC-4, EST: UTC-5 (간단히 -5로 처리)
  const usTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return usTime;
}

// 주말인지 확인
function isWeekendDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

export function getMarketHolidayStatus(): MarketHolidayStatus {
  const krHolidays = new Holidays("KR");
  const usHolidays = new Holidays("US");

  const krDate = getKoreanDate();
  const usDate = getUSEasternDate();

  // 한국 공휴일 체크
  const krHoliday = krHolidays.isHoliday(krDate);
  const krIsWeekend = isWeekendDay(krDate);

  // 미국 공휴일 체크 (NYSE 휴장일)
  const usHoliday = usHolidays.isHoliday(usDate);
  const usIsWeekend = isWeekendDay(usDate);

  // 공휴일 이름 가져오기
  let krHolidayName: string | undefined;
  let usHolidayName: string | undefined;

  if (krHoliday && Array.isArray(krHoliday)) {
    // public holiday만 필터링
    const publicHoliday = krHoliday.find((h) => h.type === "public");
    if (publicHoliday) {
      krHolidayName = publicHoliday.name;
    }
  }

  if (usHoliday && Array.isArray(usHoliday)) {
    // public 또는 bank holiday (NYSE 휴장)
    const marketHoliday = usHoliday.find(
      (h) => h.type === "public" || h.type === "bank"
    );
    if (marketHoliday) {
      usHolidayName = marketHoliday.name;
    }
  }

  return {
    kr: {
      isHoliday: krIsWeekend || !!krHolidayName,
      holidayName: krIsWeekend ? "주말" : krHolidayName,
    },
    us: {
      isHoliday: usIsWeekend || !!usHolidayName,
      holidayName: usIsWeekend ? "주말" : usHolidayName,
    },
  };
}

// 특정 날짜의 휴장 상태 확인
export function getMarketHolidayStatusForDate(date: Date): MarketHolidayStatus {
  const krHolidays = new Holidays("KR");
  const usHolidays = new Holidays("US");

  const krHoliday = krHolidays.isHoliday(date);
  const usHoliday = usHolidays.isHoliday(date);
  const isWeekend = isWeekendDay(date);

  let krHolidayName: string | undefined;
  let usHolidayName: string | undefined;

  if (krHoliday && Array.isArray(krHoliday)) {
    const publicHoliday = krHoliday.find((h) => h.type === "public");
    if (publicHoliday) {
      krHolidayName = publicHoliday.name;
    }
  }

  if (usHoliday && Array.isArray(usHoliday)) {
    const marketHoliday = usHoliday.find(
      (h) => h.type === "public" || h.type === "bank"
    );
    if (marketHoliday) {
      usHolidayName = marketHoliday.name;
    }
  }

  return {
    kr: {
      isHoliday: isWeekend || !!krHolidayName,
      holidayName: isWeekend ? "주말" : krHolidayName,
    },
    us: {
      isHoliday: isWeekend || !!usHolidayName,
      holidayName: isWeekend ? "주말" : usHolidayName,
    },
  };
}

// 휴장 상태를 문자열로 반환
export function formatMarketStatus(status: MarketHolidayStatus): string {
  const parts: string[] = [];

  if (status.kr.isHoliday) {
    parts.push(`🇰🇷 한국: 휴장${status.kr.holidayName ? ` (${status.kr.holidayName})` : ""}`);
  } else {
    parts.push("🇰🇷 한국: 정상 개장");
  }

  if (status.us.isHoliday) {
    parts.push(`🇺🇸 미국: 휴장${status.us.holidayName ? ` (${status.us.holidayName})` : ""}`);
  } else {
    parts.push("🇺🇸 미국: 정상 개장");
  }

  return parts.join("\n");
}
