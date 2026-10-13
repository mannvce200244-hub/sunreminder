# SunReminder 3.7.1 — thông báo lỗi gửi email

- Sửa trường hợp Brevo từ chối gửi thư nhưng Worker hiển thị lỗi lưu dữ liệu chung. Phân loại an toàn các lỗi xác thực API, giới hạn IP, kích hoạt/quyền tài khoản, người gửi, hạn mức và kết nối.
- Không trả phản hồi thô từ Brevo, khóa hoặc địa chỉ người nhận trong thông báo lỗi. Luồng quên mật khẩu giữ phản hồi chung chống dò tài khoản; gửi thất bại xóa mã chưa dùng và giữ tài khoản cũ.
- Cắt khoảng trắng ngoài khóa/địa chỉ gửi khi dán cấu hình. Đổi nhãn thành “Mật khẩu tài khoản SunReminder hiện tại”. Cache shell v3-9.
- npm test: 112/112 đạt. Kiểm thử Worker xác nhận sai mật khẩu trả 400 và không gọi Brevo; đúng mật khẩu nhưng khóa dịch vụ bị từ chối trả MAIL_AUTH/503 thay cho thông báo database. Có kiểm thử lỗi IP, tài khoản chưa kích hoạt, sender, hạn mức, timeout, lỗi mạng, JSON không hợp lệ và bảo mật phản hồi.
- npm run check:deploy: đạt, 25 tài nguyên công khai.

Giới hạn: chưa có phản hồi Brevo của lần người dùng gửi bị lỗi nên chưa kết luận nguyên nhân thực tế là API key, IP, quyền hay database. Không gửi thư thật hoặc truy cập mật khẩu của người dùng trong lượt sửa này. Cần người dùng thử một lần trên bản mới để lấy thông báo cụ thể.
