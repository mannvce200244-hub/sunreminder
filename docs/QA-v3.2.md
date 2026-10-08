# SunReminder Web/PWA 3.2 — kiểm chứng

Ngày: 2026-10-09.

- 48 kiểm thử tự động đạt trên Node SQLite và Cloudflare Miniflare/D1.
- Bao gồm 30 kiểm thử cũ về đồng hồ, lịch sử, nhập/xuất, chia sẻ; cơ chế quản trị mới dùng token trong bộ nhớ.
- Kiểm tra đăng ký có đồng ý, đăng nhập sai, đổi tên, đăng xuất, phân quyền người dùng/admin, tài khoản không tự bật thống kê.
- Kiểm tra tên/GPS có đồng ý riêng, dữ liệu không hợp lệ, token giả, bản gửi trễ, ghi đồng thời, bỏ thông tin và thu hồi chia sẻ.
- Kiểm tra GPS chỉ xin quyền sau khi bấm nút; xem trước không gửi; bỏ GPS chặn kết quả vị trí đến trễ; xử lý từ chối quyền.
- Kiểm tra trang mới không nhớ đăng nhập admin; tự khóa sau 10 phút; giới hạn 30 phút; phản hồi đăng nhập/báo cáo đến trễ không mở khóa trang.
- Đóng gói Cloudflare thử thành công, chỉ 20 tài sản giao diện công khai. Cơ sở dữ liệu, mật khẩu và mã backend không nằm trong thư mục public.
- Giao diện đã rà soát cấu trúc HTML, liên kết phần tử và CSS cho màn hình nhỏ. Phiên này không có công cụ điều khiển trình duyệt để xác nhận bằng ảnh chụp; quyền GPS thật vẫn phụ thuộc thiết bị và trình duyệt.
- Windows EXE không thay đổi; mã gửi thống kê cũ vẫn tương thích. Các tính năng tài khoản/tên/GPS mới thuộc Web/PWA.
