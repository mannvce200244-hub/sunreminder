# SunReminder Web/PWA 3.5 — kết quả rà soát

## Thay đổi

- Giữ nhận diện nền kem/xanh lá, chữ hệ thống và các nút quen thuộc. Mục tiêu: người dùng quản lý chia sẻ trong một biểu mẫu và một nút lưu, tập trung vào xem lịch sử thay vì thao tác file.
- Một lựa chọn chung cho thống kê + thời gian app hiển thị; tên thiết bị và GPS ngay trong biểu mẫu. GPS chỉ xin quyền khi chọn, xem trước rồi lưu. Từ chối vẫn dùng được phần còn lại. Người dùng cũ không tự bị bật thêm thời gian hay GPS.
- Tắt chia sẻ có hiệu lực ngay trong phiên; thao tác xóa dữ liệu gửi ở phần mở rộng có xác nhận. Không xóa lịch sử cục bộ.
- JSON/CSV không còn trên giao diện người dùng. Lịch sử có nút Xem thêm, truy cập được cả các bản ghi vượt giới hạn 500 trước đây.
- Admin giữ CSV, có báo cáo JSON theo bộ lọc và khu vực JSON thiết bị. Mỗi thao tác công cụ kiểm tra phiên quản trị bằng API; nhập yêu cầu khóa độc quyền, xem trước/xác nhận, sao lưu trước, kiểm tra định dạng và gộp tránh trùng. Không xuất token hoặc mật khẩu. JSON thiết bị không phải bản sao database hay lịch sử trên thiết bị khác.
- Tăng cache shell để cập nhật đồng bộ. Giữ VAPID key material và sửa URL liên hệ theo tên miền group4-ssg105. Không sửa schema hoặc dữ liệu D1.

## Đã xác minh

- `npm test`: 85/85 đạt, bao gồm logic hiện có và các trường hợp mới.
- Kiểm thử mã app thật đóng gói từ app.js với ID từ index.html và DOM giả lập: khởi động; nghỉ xong khi ẩn trang ghi đúng một lần; bật chia sẻ chung, lưu tên không GPS, tắt chia sẻ; xem đủ 551 bản ghi lịch sử.
- Kiểm thử GPS: không yêu cầu lúc khởi động; cấp quyền chỉ sau thao tác; chưa gửi khi xem trước; từ chối vẫn lưu được; bỏ vị trí; chặn callback đến muộn sau khi tắt; không bật lại do yêu cầu kiểm tra server cũ.
- Kiểm thử dữ liệu admin: xác thực máy chủ, từ chối phiên hết hạn và nhập khi cửa sổ app đang chạy; file sai không ghi; gộp idempotent; giữ token ngoài bản sao; hủy lịch đồng hồ cũ khi nhập.
- Kiểm thử Cloudflare Miniflare: API thống kê, vị trí, thời gian, đăng nhập, CSV và Web Push tiếp tục đạt. Danh sách công khai 24 file, không chứa dữ liệu riêng.
- `npm run check:deploy`: đạt với bindings DB, REMINDERS, ASSETS. Kiểm tra cú pháp và `git diff --check`: đạt.
- HTTPS của tên miền mới đã trả HTTP 200 trước khi phát hành.

## Giới hạn kiểm chứng

Chưa có kiểm thử trình duyệt trực quan trên thiết bị thực trong lượt này. DOM giả lập không xác nhận kích thước hiển thị, thứ tự focus thực, đọc màn hình, GPS hay thông báo hệ điều hành. CSS mới dùng fieldset/legend/label, nút và checkbox native, trạng thái role=status, flex-wrap và breakpoint 540px; chưa chụp màn hình để xác nhận bố cục ở các chiều rộng.

Cần thử bản phát hành trên điện thoại và desktop: lưu chia sẻ có/không vị trí, từ chối quyền, tắt/xóa chia sẻ, đọc lịch sử dài, đăng nhập quản trị, CSV và JSON. JSON báo cáo không nhập vào lịch sử. Xóa dữ liệu trình duyệt vẫn làm mất lịch sử tại thiết bị; tài khoản chưa đồng bộ lịch sử giữa máy.
