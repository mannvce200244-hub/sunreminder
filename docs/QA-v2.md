# SunReminder 2.0 — Kết quả kiểm tra

Ngày kiểm tra: 03/10/2026. Môi trường: Windows x64, .NET SDK 10.0.401, Node.js và trình duyệt trong ứng dụng.

## Đã đạt

- Publish EXE Windows x64 tự chứa runtime thành công; ProductVersion 2.0.0; kết quả ở `App-v2/SunReminder.exe`.
- **12/12 kiểm thử C#** đạt: trạng thái, tạm dừng, hoãn, ghi hoàn thành một lần, gián đoạn ngủ/khóa, cấu hình, lưu JSON, CSV và phục hồi file lỗi. Xem `test-results-v2-core.txt`.
- **16/16 kiểm thử web** đạt: các chuyển trạng thái tương đương core; nhập định dạng Windows; từ chối bản ghi sai; gộp không mất dữ liệu; nhập lặp không trùng; giữ bản ghi trùng sẵn có; CSV xuất trên 500 bản ghi. Xem `test-results-v2-web.txt`.
- Kiểm tra cú pháp JavaScript thành công.
- Đã mở bản Windows bằng hồ sơ QA riêng. Kiểm tra trực quan trang Tập trung và Lịch sử: tiếng Việt, thẻ, đồng hồ, các nút, điều hướng và thanh cuộn hiển thị. Bản cuối bổ sung đặt vị trí cuộn về đầu khi đổi trang.
- Kiểm tra web thực tế: bắt đầu → tạm dừng → nghỉ ngay → hoàn thành đủ 20 giây → ghi đúng một lần, tự trở lại tập trung; kết thúc phiên; lịch sử có đúng hàng tương ứng.
- Đổi khoảng tập trung thành 25 phút, lưu, tải lại: giá trị được giữ.
- Xem giao diện ở desktop và điện thoại 390px. Đo chiều rộng tài liệu ở 320, 768, 1024 và 1366px: không tràn ngang toàn trang. Sau kiểm tra có thêm giới hạn kích thước đồng hồ cho màn hình nhỏ và sửa tên truy cập của điều hướng dạng biểu tượng.
- Console web không ghi nhận lỗi trong các luồng đã kiểm tra.
- Service worker đăng ký và giao diện báo đã sẵn sàng ngoại tuyến; các file giao diện/icon nằm trong danh sách cache.
- Không sửa `SunReminder.Core/ReminderEngine.cs` hoặc `AppData.cs`; đường dẫn dữ liệu Windows thông thường không đổi. Bản cũ `App/SunReminder.exe` được giữ nguyên.

## Chưa nghiệm thu

- Chưa kiểm tra trên máy Mac, iPhone hoặc Android thật, chưa kiểm tra quy trình cài PWA trên các thiết bị đó.
- Chưa đăng bản web lên URL HTTPS công khai. Cần host các file tĩnh để chia sẻ/cài trên điện thoại.
- Chưa kiểm tra tải lại hoàn toàn trong chế độ mất mạng, cập nhật service worker giữa hai bản phát hành hoặc giới hạn lưu trữ thực tế của Safari.
- Chưa thử thông báo hệ điều hành/quyền thông báo, âm thanh trên từng thiết bị, startup Windows, ngủ/khóa bằng thao tác thực, DPI 125–200%, hoặc installer/uninstaller trong lượt này. Logic ngủ/khóa đã có kiểm thử tự động.
- Nhập/gộp và CSV đã kiểm thử ở tầng dữ liệu; chưa thao tác chọn file/tải file trên từng trình duyệt điện thoại.
- Người dùng dừng Computer Use bằng phím Escape trong lúc kiểm tra Windows. Không tiếp tục thao tác giao diện sau đó; các kiểm thử file và đóng gói tiếp tục bình thường.

## Lưu ý khi chạy thử

`--data-dir` tạo hồ sơ thử độc lập, có mutex riêng và không đọc/ghi vào hồ sơ Windows thông thường. Không đưa thư mục hồ sơ thử vào gói phát hành. Phiên web kiểm thử dùng `127.0.0.1`, tách vùng lưu trữ khỏi bản xem ở `localhost`.

Bản web chỉ hoạt động bộ đếm khi trang hiển thị. Việc ẩn/khóa/ngủ không được tính thành lần nghỉ hoàn thành; không tuyên bố có lời nhắc nền native trên điện thoại. Dữ liệu giữa hai nền tảng chuyển bằng JSON thủ công.
