# Bật email khôi phục miễn phí cho SunReminder

Áp dụng bản web/PWA 3.7. Tính năng đã có trong mã nguồn; chưa gửi được thư thật cho đến khi Group 4 cấu hình dịch vụ. Không cần thay mật khẩu admin.

## 1. Tạo dịch vụ gửi thư

1. Vào https://www.brevo.com/ và đăng ký tài khoản **Free**, xác minh email đăng ký.
2. Hoàn thành thông tin tài khoản. Mở phần **Transactional** và làm bước kích hoạt nếu Brevo yêu cầu. Nếu tài khoản đang chờ duyệt, cần hoàn tất bước này trước khi thử gửi.
3. Trong **Settings → Senders, Domains & Dedicated IPs → Senders**, thêm người gửi tên **SunReminder – Group 4**, dùng địa chỉ email nhóm đang quản lý. Mở hộp thư đó và xác minh người gửi.
4. Vào **SMTP & API → API Keys**, tạo khóa mới, ví dụ tên **SunReminder**. Dùng **API key**, không dùng mật khẩu Gmail hoặc SMTP key.

Gói Free hiện cho phép 300 email/ngày, không giới hạn thời gian dùng. App tự giới hạn yêu cầu gửi xuống 100/ngày để hạn chế lạm dụng. Các giới hạn bổ sung: 3 thư/tài khoản trong 15 phút và 5 thư/địa chỉ trong một giờ. Email xác minh và email đặt lại mật khẩu đều tính vào hạn mức. Xem [giới hạn chính thức của Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

Có thể bắt đầu bằng địa chỉ người gửi được Brevo cho phép và xác minh. Nếu dùng Gmail/Outlook miễn phí, bạn không sở hữu tên miền gmail.com/outlook.com nên không thể xác thực DNS cho tên miền đó; khả năng vào hộp thư đến có thể kém hơn và Brevo có thể điều chỉnh địa chỉ người gửi. Nếu Brevo yêu cầu thêm bước xác thực/kích hoạt thì phải hoàn tất theo màn hình thực tế. Đừng điền tên miền workers.dev vào bước xác thực tên miền email. Xem [hướng dẫn tên miền của Brevo](https://help.brevo.com/hc/en-us/articles/35852083084178-Domain-setup-for-better-email-deliverability).

## 2. Điền trên Cloudflare

Mở **Workers & Pages → sunreminder → Settings → Runtime variables and secrets → Production → Add variable**. Đây là biến chạy ứng dụng, không phải Build variables.

| Type | Name | Value |
| --- | --- | --- |
| Secret | SUN_BREVO_API_KEY | Khóa API vừa tạo trong Brevo |
| Secret | SUN_MAIL_FROM | Địa chỉ email người gửi đã xác minh trong Brevo |

Chọn **Save/Deploy** theo màn hình để áp dụng cho bản Production. Giữ nguyên D1 binding `DB`, Durable Object `REMINDERS` và Secret `SUN_ADMIN_PASSWORD` hiện có. Không đưa khóa API vào GitHub, ảnh chụp hay tin nhắn.

Mở https://sunreminder.group4-ssg105.workers.dev/api/config : `emailRecovery: true` chỉ cho biết đã có cấu hình, chưa chứng minh gửi thư thành công. Cần thử bước 3 để xác nhận.

## 3. Thử bằng tài khoản người dùng của bạn

1. Đóng các cửa sổ SunReminder rồi mở lại để nhận bản mới.
2. Đăng nhập một tài khoản người dùng (không dùng tài khoản quản trị group4).
3. Mở **Góc của bạn → Email khôi phục tài khoản**, nhập email nhận thư và mật khẩu hiện tại, bấm **Gửi thư xác minh email**.
4. Mở thư → mở liên kết → bấm **Xác minh email**. Liên kết tự nó chưa xác minh cho đến khi bạn bấm nút trong app.
5. Đăng xuất. Chọn **Đăng nhập → Quên mật khẩu?**, nhập đúng tên đăng nhập và email vừa xác minh.
6. Mở thư mới, đặt mật khẩu mới dài 12–128 ký tự và xác nhận. Thử đăng nhập bằng mật khẩu mới; mật khẩu cũ phải bị từ chối.

Liên kết có hiệu lực 15 phút và chỉ dùng một lần; khi yêu cầu lại thì dùng thư mới nhất. Đổi mật khẩu đăng xuất các phiên cũ. Nếu mở email trong tab mới, tab này chỉ xử lý khôi phục khi đồng hồ đang mở ở tab khác; xong thì đóng tab email và trở lại app.

Tài khoản cũ vẫn giữ nguyên. Người dùng phải thêm và xác minh email **khi còn nhớ mật khẩu**. Tài khoản đã quên mật khẩu nhưng chưa xác minh email không thể tự khôi phục bằng email. Email không xuất hiện trên dashboard thống kê. Tài khoản `group4` được quản lý bằng Secret admin riêng, không dùng luồng email này.

## 4. Nếu không nhận được thư

- Xem Spam/Thư rác; đợi một chút rồi kiểm tra **Brevo → Transactional → Logs**.
- Kiểm tra người gửi đã xác minh, tính năng Transactional được kích hoạt, API key còn hợp lệ và hạn mức chưa hết.
- Kiểm tra đã nhập biến ở Production và đã Deploy. `SUN_MAIL_FROM` phải là địa chỉ gửi đã xác minh, không phải tên biến hoặc mật khẩu.
- Màn hình Quên mật khẩu luôn trả lời chung để không tiết lộ tài khoản có tồn tại hay không. Không thấy lỗi không đồng nghĩa thư đã được giao.
- Không thử liên tục; app có giới hạn chống gửi thư hàng loạt.

Tích hợp dùng [API gửi email chính thức của Brevo](https://developers.brevo.com/docs/send-a-transactional-email). Khóa chỉ ở máy chủ; mã trong cơ sở dữ liệu được băm, không lưu mã nguyên văn.

## Chuông và thông báo khi chạy nền

Ở **Đồng hồ**, chọn **Bật chuông & nhắc nền**, cấp quyền rồi chọn **Thử thông báo**. Bắt đầu phiên để máy chủ có lịch nhắc. Trên Windows, kiểm tra Settings → System → Notifications cho trình duyệt đang dùng: bật banner, âm thanh và thông báo trên màn hình khóa; tắt Không làm phiền nếu muốn nhận lời nhắc. Trên macOS, kiểm tra System Settings → Notifications cho trình duyệt/app. Trên iPhone/iPad, thêm app vào Màn hình chính rồi mở app từ đó và cho phép thông báo.

Chuông ba nốt phát khi trang còn hoạt động và trình duyệt cho phép phát âm thanh. Khi trang bị treo/đóng hoặc khóa màn hình, thông báo đẩy dùng âm thanh thông báo của hệ điều hành nếu được cho phép. Web không thể ép chuông riêng chạy liên tục, vượt Không làm phiền, hoặc bảo đảm thông báo đúng giây khi thiết bị ngủ/mất mạng/tắt nguồn. Một số trình duyệt không giữ banner cho đến khi bấm; nút Thử thông báo giúp kiểm tra thiết bị thực tế.

Đổi tab không làm app tự tạm dừng. Tiêu đề tab cập nhật theo hạn giờ thực tế mỗi khi trình duyệt cho chạy JavaScript; trình duyệt có thể giảm tần suất cập nhật tab nền. Nếu hiển thị **Đã tạm dừng**, chọn **Tiếp tục** để chạy lại. Không xóa dữ liệu trình duyệt để cập nhật app vì lịch sử nằm trên thiết bị.

## Phân biệt mật khẩu và lỗi gửi thư (3.7.1)

Ô xác minh email dùng mật khẩu tài khoản người dùng SunReminder đang đăng nhập. Không nhập mật khẩu hộp thư, mật khẩu Brevo hoặc mật khẩu admin. Nếu mật khẩu sai, app báo “Mật khẩu hiện tại chưa đúng”. Nếu Brevo từ chối sau khi kiểm tra mật khẩu, app hiện nguyên nhân riêng thay vì lỗi lưu dữ liệu chung:

| Mã | Cần kiểm tra |
| --- | --- |
| MAIL_AUTH / MAIL_CONFIG | SUN_BREVO_API_KEY phải là API key còn hiệu lực, không phải SMTP key; sao chép đúng toàn bộ khóa |
| MAIL_SENDER | SUN_MAIL_FROM đúng địa chỉ người gửi đã Verified trong Brevo |
| MAIL_ACTIVATION / MAIL_PERMISSION / MAIL_ACCOUNT | Trạng thái tài khoản Transactional, quyền API và hạn mức trên Brevo |
| MAIL_IP | Brevo → Security → Authorized IPs và thông báo chặn IP; xác định đúng IP của máy chủ trước khi cho phép, không thêm IP lạ tùy ý |
| MAIL_LIMIT | Giới hạn tần suất hoặc lượng thư; chờ và kiểm tra hạn mức |
| MAIL_NETWORK / MAIL_TIMEOUT / MAIL_SERVICE | Lỗi kết nối hoặc dịch vụ; thử lại sau |
| MAIL_REJECTED | Yêu cầu bị Brevo từ chối, cần kiểm tra cấu hình người gửi và nhật ký |

Phản hồi thô của Brevo không được gửi ra giao diện hoặc log vì có thể chứa thông tin riêng. Luồng Quên mật khẩu vẫn trả lời chung để tránh tiết lộ tài khoản có tồn tại. Việc ô mật khẩu bị xóa sau khi gửi là chủ ý của app, không có nghĩa bạn đã nhập sai.

Bản 3.7.2 sửa lỗi MAIL_NETWORK do tùy chọn redirect không tương thích Cloudflare. Nếu còn dùng bản cũ, đóng hết cửa sổ app rồi mở lại trước khi thử gửi. MAIL_REDIRECT nghĩa là dịch vụ trả chuyển hướng và app đã chặn để bảo vệ khóa API.
