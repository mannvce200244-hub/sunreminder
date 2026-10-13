# Kiểm thử SunReminder 3.8

Ngày kiểm tra: 13/10/2026.

## Thay đổi

- Đăng nhập hoặc tạo tài khoản thành công tự đóng hộp thoại; tài khoản quản trị vẫn chuyển sang dashboard.
- Email được thêm trong hồ sơ theo lựa chọn người dùng, không chặn việc dùng app.
- Đăng nhập bằng tên hoặc email đã xác minh. Không chọn tùy ý một tài khoản nếu dữ liệu cũ có email trùng.
- Xác minh và đặt lại mật khẩu bằng mã 6 số; hỗ trợ số 0 đầu, thời hạn 15 phút, tối đa 5 lần nhập và chỉ dùng một lần.
- Yêu cầu lại làm mã cũ mất hiệu lực; đặt lại mật khẩu thu hồi phiên cũ. Liên kết từ bản 3.7 vẫn được hỗ trợ trong thời hạn ban đầu.
- Tài khoản, lịch sử và lựa chọn chia sẻ hiện có được giữ nguyên.

## Kết quả tự động

132/132 kiểm thử đạt qua npm test, gồm SQLite cục bộ, Cloudflare D1 và workerd/Miniflare. Bao phủ email chưa xác minh, đăng nhập bằng tên/email, mã sai/hết hạn/dùng lại, giới hạn đoán mã đồng thời, hai tài khoản xác minh cùng email, đặt lại mật khẩu và thu hồi phiên. Kiểm thử giao diện dùng DOM mô phỏng để kiểm tra đóng hộp thoại, chuyển bước, yêu cầu lại và bỏ qua phản hồi đến muộn.

Kiểm thử workerd xác nhận luồng gửi mã → xác minh → đăng nhập bằng email, dùng dịch vụ thư mô phỏng; giữ kiểm tra lỗi mạng, từ chối quyền và chặn chuyển hướng để bảo vệ khóa API.

## Giới hạn kiểm chứng

Chưa xác nhận thư thật vào hộp thư người dùng trong đợt kiểm thử này. Chưa kiểm tra trực quan trên thiết bị thật. Có cấu hình email trên máy chủ không đồng nghĩa thư đã được giao; cần thử bằng tài khoản và hộp thư do người dùng quản lý. Mã gắn với cửa sổ vừa yêu cầu; nếu đóng hộp thoại hoặc tải lại trang phải yêu cầu mã mới.
