# Kiểm thử bản Cloudflare — 08/10/2026

- 30 kiểm thử web/Node API cũ đạt.
- 9 kiểm thử Worker/D1 trên runtime Miniflare ổn định đạt: file công khai và loại file riêng tư; chưa cấu hình Secret; xác thực/Origin; hết hiệu lực phiên sau đăng xuất/đổi Secret; thống kê/lọc ngày/CSV; gửi trùng và cạnh tranh revision; tranh chấp mã thiết bị; thu hồi đồng thời; dữ liệu sai; xóa snapshot; tránh ghi lại ngày không đổi; giới hạn kích thước và đăng nhập.
- `wrangler deploy --dry-run` đóng gói thành công Worker, binding D1 và 16 file giao diện.
- Kiểm thử tương thích dùng compatibility_date 2026-08-01 ở cả cấu hình triển khai và Miniflare.
- Không sửa mã Windows hoặc logic đồng hồ. EXE v3 và ZIP release v3.0.0 giữ nguyên.

Chưa triển khai vào tài khoản Cloudflare thật. Cần xác nhận tự tạo D1, Secret runtime, URL HTTPS, hạn mức Free và toàn bộ luồng trên thiết bị sau khi người dùng bấm Deploy. Chưa kiểm thử tải lớn hoặc đánh giá bảo mật độc lập. Kiểm thử cục bộ không mô phỏng đầy đủ quota/CPU Free.
