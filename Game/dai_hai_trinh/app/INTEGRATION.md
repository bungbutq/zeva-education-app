# Tích hợp vào ZEVA Apps Script

Tạo hai file HTML trong dự án Apps Script từ `client_93_naval_game.html` và `styles_93_naval_art.html`.

Trong index của Apps Script, ngay sau include `client_92_classes`, thêm:

```html
<?!= include('styles_93_naval_art'); ?>
<?!= include('client_93_naval_game'); ?>
```

Game tự thêm nút vào `gamesCardList` của menu Trò chơi desktop hiện có. Không thay index của GitHub wrapper. Ảnh dùng URL GitHub được ghim vào commit cụ thể, nằm trong thư mục `game/hai-chien-tu-vung`.

Game gọi `getBbgVocabularySample` bằng session hiện tại và `contentType: vocabulary`, giống nguồn từ Học mới. Không cần endpoint mới hoặc sửa dữ liệu học tập. Hai đội dùng chung thiết bị, luân phiên; bộ từ cần ít nhất bốn nghĩa khác nhau. Chơi lại tải mới bộ từ.

Để gỡ game, bỏ hai include trên và xóa hai partial tương ứng. Khi triển khai bằng công cụ trong workspace ZEVA, bản nguồn và cấu hình deployment cũ được lưu trong `artifacts/naval-game/deployment`; có thể khôi phục version cũ qua Apps Script.
