# Hải chiến từ vựng

Hai đội Cướp biển và Hải quân chơi chung màn hình, luân phiên chọn nghĩa của từ trong bộ Học mới. Đúng gây một phát đạn lên đối thủ; sai nhận một phát. Nhận 10 phát sẽ chìm. Không ghi NOW, TEST hoặc EXP.

`ships-atlas.png` là ảnh PNG trong suốt được tạo bằng ImageGen: 2 cột (cướp biển, hải quân), 11 hàng (nguyên vẹn rồi 10 mức hư hại). CSS dùng background-size 200% 1100%, vị trí ngang 0%/100%, vị trí dọc 0% đến 100% bước 10%.

Mã tích hợp Apps Script nằm trong `app/`. Chỉ áp dụng hai thay đổi nhỏ của index được mô tả trong `app/INTEGRATION.md`, không thay index của GitHub wrapper bằng index Apps Script. Chạy kiểm tra game từ bản nguồn ZEVA bằng `node tools/test_naval_game.cjs` với Playwright được cài đặt.
