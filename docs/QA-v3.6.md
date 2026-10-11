# SunReminder Web/PWA 3.6 — lời mời chia sẻ lần đầu

## Thay đổi

- Đưa đồng ý chia sẻ thống kê và thời gian lên hộp thoại lần đầu mở app. Hai lựa chọn Đồng ý chia sẻ / Để sau; đóng hoặc Escape tương đương Để sau. Chưa đồng ý thì không gửi dữ liệu.
- GPS không bật sẵn, chỉ xin quyền khi người dùng chọn. Có xem trước vị trí; từ chối GPS vẫn gửi thống kê/thời gian nếu người dùng đồng ý. Không theo dõi liên tục.
- Ghi nhớ quyết định trong trình duyệt, giữ nguyên consent cũ kể cả đã ngừng. Cài đặt chỉ giữ trạng thái và nút đổi lựa chọn, ngừng, xóa. Không tự bật lại sau xóa dữ liệu đã gửi.
- Chờ quyền sở hữu cửa sổ app và hộp thoại khác đóng, không chồng lời mời khi tải lại. Hủy ngăn callback GPS hoặc kết quả kiểm tra server muộn bật lại chia sẻ.
- Native dialog, tiêu đề được focus, nội dung giải thích dữ liệu, nút đóng, Escape, trạng thái đọc được, chiều cao cuộn trong màn hình nhỏ. Không thay schema D1 hoặc logic nghỉ/check-in.
- Cập nhật hướng dẫn, phiên bản 3.6.0 và cache shell v3-7; bản cũ cập nhật sau khi đóng hết cửa sổ rồi mở lại.

## Đã kiểm chứng

- npm test: 94/94 đạt, gồm mã app thật với DOM giả lập và Cloudflare Miniflare/SQLite.
- Bật lần đầu không gọi GPS hoặc gửi dữ liệu; đồng ý lưu thống kê/thời gian/tên/GPS trong một thao tác.
- Từ chối rồi tải lại không hỏi lại; có thể mở lại từ Cài đặt. Escape, nút đóng, hủy sửa không thay consent đang lưu.
- GPS bị từ chối, bỏ GPS cũ, callback muộn, server phản hồi muộn sau hủy, mất quyền sở hữu tab không tự ghi/gửi dữ liệu.
- Không có mạng hoặc không lưu được consent: không báo thành công, vẫn có thể dùng app bằng Để sau.
- Không chồng lời mời khi trang ẩn, tab phụ hoặc hộp thoại khác đang mở. Người dùng cũ không tự bật thêm thời gian/GPS; ngừng hoặc xóa không bị hỏi lại.
- Hồi quy đồng hồ nghỉ khi trang ẩn ghi đúng một lần, lịch sử 551 bản ghi, tài khoản/admin, xuất nhập riêng cho admin, Web Push, consent và xóa dữ liệu.
- npm run check:deploy: đạt, 24 tài nguyên công khai, bindings DB/REMINDERS/ASSETS.

## Giới hạn

Chưa kiểm thử trực quan trên trình duyệt hoặc GPS hệ điều hành thật trong lượt này. DOM giả lập không xác nhận bố cục, focus và đọc màn hình trên thiết bị thực. Không gửi thống kê hoặc vị trí giả vào production để kiểm thử. Người dùng chọn Để sau vẫn dùng đầy đủ app nhưng không có thống kê mới gửi đến dashboard.
