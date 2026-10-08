# SunReminder 3.0 — Hướng dẫn sử dụng

**Nắng sớm, mắt khỏe · Được thực hiện bởi Group 4**

Một ứng dụng nhỏ nhắc bạn nghỉ mắt trong lúc học và làm việc. Không cần tài khoản. Dữ liệu được lưu trên thiết bị.

## 1. Mở ứng dụng

### Windows 10/11 x64

Mở **App-v3/SunReminder.exe**, hoặc bấm **Launch-SunReminder.cmd**. Bản mới kèm runtime, không cần cài .NET. Nếu bản cũ đang chạy, chọn **Thoát ứng dụng** trong app hoặc menu biểu tượng mặt trời ở khay hệ thống trước khi mở bản mới. Bấm X có thể chỉ ẩn app, chưa thoát.

**Install.cmd** cài bản 3.0 cho tài khoản Windows hiện tại, tạo shortcut Desktop và Start menu. Cần thoát mọi phiên SunReminder trước khi cài. Việc cài không tự bật khởi động cùng Windows.

Lần chạy thông thường vẫn dùng `%LOCALAPPDATA%\SunReminder\data.json` như bản trước. Không cần chuyển dữ liệu để cập nhật trên cùng máy. File EXE cũ trong `App` được giữ nguyên để đối chiếu/quay lại; không chạy đồng thời hai phiên trên cùng hồ sơ.

### Bản web trên máy tính

Bản web nằm trong thư mục `web`, chạy trên Windows, macOS và các trình duyệt hiện đại. Để mở từ mã nguồn, cần Node.js 24 LTS:

```sh
cd SunReminder/web
node setup-admin.mjs
node server.mjs
```

Mở `http://localhost:4173`. Trên Windows có thể bấm **Start-Web.cmd**. Trên macOS có thể chạy `sh Start-Web.command` trong thư mục SunReminder. Giữ cửa sổ server mở trong lần tải đầu; sau khi báo sẵn sàng ngoại tuyến, app được lưu trong trình duyệt.

Không bấm đúp `index.html`: các module JavaScript và khả năng cài/offline cần một web server. `localhost` của điện thoại là chính điện thoại, không phải máy tính.

### Điện thoại và cài lên màn hình chính

Để dùng trên điện thoại và gửi thống kê, **triển khai máy chủ Node.js lên HTTPS với ổ dữ liệu bền vững** theo [hướng dẫn Group 4](QUAN-TRI.md). Gói này chưa có URL công khai hay bản phát hành App Store/Google Play. Người tham gia không cần tài khoản; quản trị cần đăng nhập.

- **Android:** mở URL HTTPS trong Chrome → menu → Cài đặt ứng dụng / Thêm vào màn hình chính.
- **iPhone/iPad:** mở trong Safari → Chia sẻ → Thêm vào Màn hình chính.
- **macOS:** mở trong trình duyệt; dùng Thêm vào Dock hoặc Cài đặt ứng dụng nếu trình duyệt hỗ trợ.
- **Windows:** Chrome/Edge có thể cài bản web thành cửa sổ riêng. Bản EXE phù hợp hơn khi cần khay hệ thống.

Tên menu có thể khác theo phiên bản trình duyệt. Trong app, **Hướng dẫn → Cài trên thiết bị** cung cấp hướng dẫn tương ứng. Chờ thông báo **Đã sẵn sàng dùng ngoại tuyến** sau lần mở đầu trước khi dùng khi mất mạng.

## 2. Bắt đầu trong ba bước

1. Vào **Tập trung**, bấm **Bắt đầu tập trung**. Mặc định đồng hồ chạy 20 phút.
2. Khi có lời nhắc, bấm **Bắt đầu nghỉ**. Thả lỏng vai, chớp mắt tự nhiên và nhìn ra xa. Đồng hồ nghỉ mặc định 20 giây.
3. Khi đếm hết, app tự ghi **đã check-in nghỉ mắt** đúng một lần và bắt đầu chu kỳ tập trung tiếp theo. Check-in ngoài trời vẫn tự đánh dấu riêng.

| Nút | Tác dụng |
|---|---|
| Tạm dừng / Tiếp tục | Giữ và tiếp tục thời gian còn lại |
| Nghỉ ngay | Bắt đầu đếm ngược nghỉ ngay lập tức |
| Hoãn | Nhắc lại sau số phút đã cài đặt; lần nghỉ dở không được tính |
| Kết thúc phiên / Kết thúc | Dừng chu kỳ hiện tại |
| Đóng cửa sổ nhắc | Hoãn lời nhắc; không ghi hoàn thành |
| Hôm nay tôi đã ra ngoài | Đánh dấu check-in hôm nay; bấm lại để bỏ đánh dấu |
| Thử lời nhắc / Thử thông báo | Xem mẫu, không thay đổi đồng hồ hay lịch sử |

## 3. Cài đặt

- Khoảng tập trung: **5–120 phút**.
- Thời gian nghỉ: **20–120 giây**.
- Hoãn: **1–30 phút**.
- Cửa sổ nhắc và âm thanh tùy chọn; âm thanh mặc định tắt.
- Lời nhắc ngoài trời theo giờ đã chọn, mặc định tắt. App cần đang hoạt động đúng phút đó; không gửi bù lịch bỏ lỡ.
- Bấm **Lưu cài đặt** để áp dụng. Đổi thời gian sẽ đặt lại chu kỳ hiện tại.

Trên Windows còn có **ẩn xuống khay khi bấm X** và **khởi động cùng Windows**. Khởi động cùng Windows chỉ bật khi bạn chủ động chọn và lưu.

Trên web, nút **Bật thông báo thiết bị** yêu cầu quyền trình duyệt. Bạn có thể từ chối và dùng cửa sổ nhắc trong app. App không tự đổi chế độ Không làm phiền hoặc quyền hệ thống.

## 4. Lịch sử, sao lưu và chuyển thiết bị

**Lịch sử** hiển thị thống kê 7 ngày và tối đa 500 lần nghỉ gần nhất. **Xuất CSV** xuất tất cả lần nghỉ để mở trong Excel, không chứa cài đặt/check-in. Chỉ số biểu thị đồng hồ đếm ngược hoàn thành, không xác nhận bạn thực sự nhìn xa.

**Sao lưu JSON** chứa cài đặt, lịch sử và check-in. Để chuyển từ Windows sang web:

1. Windows → **Lịch sử → Sao lưu JSON**. Bản cũ cũng có thể dùng file `data.json` trong thư mục dữ liệu.
2. Chuyển file đó sang thiết bị cần dùng.
3. Web → **Cài đặt → Nhập từ Windows / JSON** → chọn file.
4. Đọc số bản ghi, chọn **Sao lưu & nhập**. App tải bản sao dữ liệu web hiện tại trước, gộp lịch sử/check-in và áp dụng cài đặt trong file.

Nhập lại cùng file không thêm trùng bản ghi. File lỗi bị từ chối trước khi thay dữ liệu. Dữ liệu gốc Windows không bị sửa. Không có đồng bộ tự động hoặc nhập ngược từ web vào EXE trong phiên bản này.

Web lưu trong trình duyệt theo địa chỉ trang. Hai trình duyệt, hai địa chỉ hoặc hai thiết bị có dữ liệu riêng. Xóa dữ liệu trang hoặc dùng chế độ riêng tư có thể làm mất lịch sử. Hãy giữ file JSON ở nơi an toàn. Khi bộ nhớ đầy hoặc bị chặn, app hiện lỗi thay vì báo lưu thành công.

**Xóa lịch sử** cần xác nhận, xóa lần nghỉ và check-in, giữ cài đặt.

## 5. Khi chuyển app, ngủ hoặc khóa màn hình

| Tình huống | Windows EXE | Web / ứng dụng cài từ web |
|---|---|---|
| Chuyển sang ứng dụng khác | Tiếp tục nhắc khi vẫn chạy trong khay | Khi trang bị ẩn, ngừng phiên đang chạy |
| Máy ngủ hoặc khóa | Ngừng phiên; khi mở lại bắt đầu chu kỳ đầy đủ | Không bảo đảm lời nhắc nền; khi quay lại bắt đầu chu kỳ mới |
| Đã tạm dừng bằng tay | Giữ thời gian còn lại | Giữ thời gian còn lại khi ẩn/hiện trang |
| Thoát / tải lại | Chu kỳ không được khôi phục | Đồng hồ trở về sẵn sàng |
| Lần nghỉ bị gián đoạn | Không ghi hoàn thành | Không ghi hoàn thành |

Bản web không có push từ server hoặc cơ chế báo thức hệ điều hành. Giữ app mở, màn hình hoạt động để bộ đếm chạy. Không coi bản PWA là ứng dụng native có hẹn giờ nền trên điện thoại.

## 6. Group 4

| Thành viên | Vai trò |
|---|---|
| **Nguyễn Văn Mẫn** | **Leader · Trưởng nhóm** |
| Nguyễn Trần Đức Anh | Thành viên |
| Nguyễn Trần Phúc Đăng | Thành viên |
| Phan Võ Anh Hào | Thành viên |

Thông tin nhóm có trong **Về Group 4** trên Windows và **Group 4** trên web. SunReminder hỗ trợ xây dựng thói quen cho dự án Nắng sớm, mắt khỏe; không đo thị lực hoặc chẩn đoán bệnh.

## 7. Phát triển và phát hành

- Windows: .NET 10 SDK, `Build.cmd`. Kết quả mới ở `App-v3`.
- Web: không có thư viện bên ngoài hoặc bước npm install; `node setup-admin.mjs`, sau đó `node server.mjs` để chạy, `node --test tests/*.test.mjs` để kiểm thử.
- Triển khai cả web và API Node.js theo [QUAN-TRI.md](QUAN-TRI.md). Không dùng static hosting cho chức năng thu thống kê.
- Giữ đường dẫn thư mục ổn định để không thay vùng dữ liệu trình duyệt. Tăng phiên bản `CACHE` trong `sw.js` mỗi lần phát hành thay đổi web. Bản mới hoạt động sau khi đóng hết các cửa sổ bản cũ và mở lại.
- Chế độ QA riêng trên Windows: `SunReminder.exe --data-dir <đường-dẫn-thử>`. Không dùng thư mục dữ liệu thật để thử thao tác xóa.

Tham khảo yêu cầu cài PWA: [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## 8. Chia sẻ thống kê tự nguyện

Vào **Cài đặt → Chia sẻ thống kê**, đọc thông tin và tích đồng ý để bật. Trên Windows nhập URL máy chủ Group 4 trước. Mặc định tắt. Có **Gửi ngay**, **Ngừng chia sẻ** và **Xóa thống kê đã gửi**. Nếu đang chia sẻ, nhập/xóa lịch sử sẽ cập nhật số liệu máy chủ ở lần gửi tiếp theo. Toàn bộ quy tắc dữ liệu, quản trị và triển khai nằm trong [QUAN-TRI.md](QUAN-TRI.md).



## 9. Tài khoản tùy chọn, tên thiết bị và GPS (Web/PWA 3.3)

- Bấm **Đăng nhập** trên đầu trang. Chọn **Tạo tài khoản**, điền tên đăng nhập, tên hiển thị, mật khẩu 12–128 ký tự và đồng ý lưu tài khoản. Tên đăng nhập không dấu, gồm 3–32 chữ/số/gạch dưới; không dùng group4 hoặc admin. Không yêu cầu email. Chưa hỗ trợ quên mật khẩu qua email, nên lưu mật khẩu trong trình quản lý mật khẩu của bạn.
- Muốn dùng ngay: đóng hộp đăng nhập hoặc chọn **Tiếp tục không đăng nhập**. Đồng hồ, lịch sử, check-in, sao lưu và chia sẻ tự nguyện vẫn dùng được.
- Sau đăng nhập, bấm **Xin chào, …** để đổi tên hoặc đăng xuất. Tài khoản không tự bật chia sẻ, không tự lấy GPS và chưa đồng bộ lịch sử giữa các máy. Đóng/tải lại trang cần đăng nhập lại; phiên người dùng tối đa một giờ.
- Đặt tên thiết bị: vào **Cài đặt → Thiết bị của bạn**, nhập ví dụ “Laptop của Mẫn”. Trình duyệt không đọc được tên máy tính thực.
- Muốn chia sẻ GPS: bấm **Lấy vị trí hiện tại**, cho phép trong trình duyệt, xem tọa độ, thời gian và sai số. Chưa có gì được gửi ở bước xem trước. Bạn có thể từ chối quyền hoặc chỉ chia sẻ tên.
- Bật chia sẻ thống kê ở phía trên, đánh dấu đồng ý chia sẻ thông tin rồi bấm **Lưu & gửi thông tin**. Tên tài khoản đang đăng nhập (nếu có) được kèm ở lần lưu này; đăng nhập/đổi tên riêng không tự sửa thông tin trên dashboard.
- Bỏ GPS: **Bỏ vị trí khỏi bản nháp → Lưu & gửi thông tin**. Bỏ cả tên/GPS: bỏ dấu đồng ý riêng rồi lưu. Giữ bật chia sẻ tới khi thông báo gửi thành công. Khi offline, thay đổi chờ gửi lại.
- Muốn ngừng và xóa toàn bộ thống kê, tên/vị trí đã gửi, chọn **Xóa thống kê đã gửi**. Lịch sử tại máy vẫn giữ. Thao tác này không xóa tài khoản đăng nhập.
- Bấm **Đăng nhập** trên app, nhập tài khoản **group4** và mật khẩu quản trị: app chuyển thẳng vào dashboard. Tài khoản người dùng cũng dùng nút Đăng nhập này và ở lại app. Mỗi lần mở/tải lại trang phải đăng nhập; tự khóa sau 10 phút không thao tác và hết hạn sau tối đa 30 phút.

Tên là do người dùng tự khai. GPS có thể gần đúng, đặc biệt trên máy tính; không theo dõi liên tục. Cơ chế quyền dựa trên [Geolocation của trình duyệt](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition). Các tính năng mới ở bản Web/PWA trên Windows, macOS và điện thoại; bản Windows EXE v3 cũ vẫn gửi thống kê theo cách cũ.

## 10. Chia sẻ thời gian sử dụng app

Vào **Cài đặt**, bật chia sẻ thống kê rồi tích **Tôi đồng ý chia sẻ thời gian sử dụng app với Group 4**. Tùy chọn mới mặc định tắt, kể cả với người đã chia sẻ thống kê trước đây. Chỉ ghi từ lúc đồng ý; không ước lượng ngược lịch sử cũ.

App cộng số giây theo ngày khi trang đang hiển thị và cửa sổ này giữ quyền chạy app. Chuyển tab, thu nhỏ, đóng app, khoảng ngủ máy hoặc đồng hồ hệ thống nhảy sẽ không được tính. Đây là thời gian app hiển thị, không chứng minh người dùng liên tục tương tác. Không thu nội dung màn hình hay lịch sử thao tác. Việc ghi thời gian không tạo check-in và không đổi cách tính ngày hoạt động cũ.

Dữ liệu lưu trên thiết bị khoảng mỗi 5 giây, gửi cùng thống kê khi có mạng khoảng mỗi 30 giây; có thể thiếu vài giây khi đóng đột ngột. Tắt lựa chọn để ngừng ghi mới. **Xóa thống kê đã gửi** xóa cả thời gian trên máy chủ và ngừng chia sẻ; lịch sử nghỉ mắt tại máy vẫn giữ.

Dashboard có **Thời gian sử dụng app**, cột thời gian từng thiết bị và bảng theo ngày; tất cả theo khoảng ngày đang chọn. CSV thêm cột UsageSeconds, bao gồm ngày có thời gian sử dụng dù chưa check-in. Có thể bấm **Xem thống kê** để tải số liệu mới nhất.
