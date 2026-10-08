# SunReminder Web/PWA 3.3 — kiểm chứng

- 58 kiểm thử: giữ các kiểm thử lịch sử/đồng hồ/GPS/tài khoản, bổ sung đăng nhập chung và thời gian sử dụng.
- SQLite và D1: phân quyền theo tài khoản, chuyển dashboard dùng cookie một lần, hết hạn 60 giây, chống đổi phiên lặp và claim đồng thời, cookie không truy cập được API báo cáo.
- Thời gian: cần đồng ý riêng; không ghi trước đồng ý; bỏ khoảng tab ẩn/ngủ máy/đồng hồ nhảy; chia đúng ngày địa phương; giữ phần giây lẻ; lưu ngoại tuyến và gửi lại không đếm trùng.
- Báo cáo/CSV gồm ngày chỉ mở app không có check-in. Lọc ngày chính xác, không đổi nghĩa số ngày hoạt động cũ. Gói gửi cũ không xóa thời gian đã chia sẻ; thu hồi xóa cả thời gian và chặn gói gửi trễ.
- Kiểm thử giao diện bằng sự kiện mô phỏng: một nút đăng nhập; admin chuyển /admin, tài khoản thường ở app; không gọi mạng khi chỉ dùng chế độ khách.
- Không có công cụ điều khiển trình duyệt trong phiên này để chụp ảnh xác nhận bố cục. CSS và liên kết phần tử được kiểm tra tĩnh.
