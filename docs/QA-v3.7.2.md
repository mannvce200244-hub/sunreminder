# SunReminder 3.7.2 — sửa MAIL_NETWORK trên Cloudflare

## Nguyên nhân tái hiện được

Cloudflare workerd không hỗ trợ RequestInit.redirect='error'. Đoạn gửi email dùng tùy chọn này nên phát sinh TypeError trước khi gửi yêu cầu tới Brevo; catch chuyển thành MAIL_NETWORK. Test Node với fetch giả lập trước đây không phát hiện giới hạn riêng của runtime này.

## Sửa

Dùng redirect='manual' và tự từ chối mọi phản hồi 3xx với MAIL_REDIRECT. Không theo chuyển hướng, không gửi khóa API tới đích khác. Giữ giới hạn thời gian, xác minh mật khẩu, rate limit và chính sách khôi phục hiện có. Không thay tài khoản/dữ liệu hoặc cấu hình Brevo. Giao diện 3.7.2, cache shell v3-10.

## Kiểm chứng

- Tái hiện code cũ bằng Miniflare/workerd: cả ba luồng gửi hợp lệ, lỗi xác thực dịch vụ và chuyển hướng đều trả MAIL_NETWORK trước khi tới dịch vụ giả lập.
- Sau sửa: Worker dùng fetch thật và outbound service giả lập, gửi thành công khi provider trả 201; 401 được phân loại MAIL_AUTH; 302 bị từ chối MAIL_REDIRECT và chỉ gọi đúng một URL Brevo. Không có lưu lượng email ra ngoài trong kiểm thử.
- npm test: 115/115 đạt.
- npm run check:deploy: đạt, 25 tài nguyên công khai.

Chưa xác nhận giao thư thật vào hộp thư người dùng. Sau khi triển khai, người dùng thử gửi lại một lần; nếu Brevo còn từ chối do cấu hình, app sẽ hiển thị mã lỗi riêng.
