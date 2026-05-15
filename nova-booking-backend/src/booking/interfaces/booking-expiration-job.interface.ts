export interface BookingExpirationJobData {
  bookingIds: string[];
  orderCode: number;
  userId: string;
  courtId: string;
  bookingDate: string;
  courtName: string;
  /** Danh sách startTime (HH:mm) để xóa Redis lock. */
  slots: string[];
}
