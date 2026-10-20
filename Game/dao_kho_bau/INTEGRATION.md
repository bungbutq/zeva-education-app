# Kết nối ZEVA — cùng nguồn lớp với Đại Hải Trình

## Tích hợp tàu nâng cấp — 19/10/2026

- Bộ 60 tàu v2 dùng chung ở xưởng, bản đồ, bảng Chiến thuyền, câu hỏi và giao chiến. `shipyard.js` ánh xạ 30 tổ hợp/đội theo khoang/pháo/buồm; chỉ trừ 100 vàng sau khi ảnh nâng cấp giải mã thành công.
- Đã thêm hai căn cứ và hai cảnh bến cảng vào manifest; toàn bộ 64 PNG mới/thay đổi đã phát hành ở commit `e1524196bb81aeec66394fbaca2d4e14a8c3c217`. Đã tải HTTP và đối chiếu SHA-256 đủ 64/64 tệp.
- `client_106_treasure_game.html` và `dist/client_treasure_game.html` đã được dựng bằng `--production` với URL commit trên. Đây là bản nhúng tại workspace; đợt tích hợp này chưa cập nhật deployment Apps Script đang chạy.
- Đã sửa lỗi thiếu dấu đóng mảng làm `game.js` không khởi động, sửa luật hiển thị 1–4 pháo/1,1,2,3 cột buồm, biểu tượng buồm theo đội và nút nâng cấp tràn hàng ở khung thấp.
- Nghiệm thu: 25 kiểm thử engine/data-source/artwork/routes đạt (kiểm thử manifest được chạy lại sau khi thêm căn cứ); browser xưởng đạt ở 1368×838, 1920×1080, 1024×768 và 844×390, gồm thiếu vàng, ảnh lỗi/thử lại, nâng cả hai đội tới Lv3 và đồng bộ tàu ở bản đồ/chi tiết. Host production đạt chọn lớp/buổi học, từ vựng, sandbox và vòng đời phiên. `brain_validate --module ui_shared` đạt.
- `brain_validate --all` còn báo nguồn index `EDU-DATA-ATTENDANCE-CHECKINS` và các ngưỡng CSS toàn app. Chưa xử lý các mục ngoài game trong đợt này. Các test gameplay cũ dựa vào chọn hiệu ứng khởi đầu cần đồng bộ riêng trước một đợt nghiệm thu toàn game.
- Bằng chứng và ZIP: `artifacts/treasure-ships-integration-20261019`.

## Khung giao diện mặc định

Theo yêu cầu ngày 16/10/2026, dùng viewport **1368 × 838** làm khung mặc định khi chỉnh và nghiệm thu giao diện. Hai kiểm thử trình duyệt dùng kích thước này; các kích thước khác chỉ kiểm tra khả năng co giãn. Sân chơi giữ hệ tọa độ 1600 × 900, thu phóng đồng đều và căn giữa bằng flex để không lệch hoặc cắt mép khi viewport nhỏ hơn sân chơi.

## Hợp đồng đang dùng
Host giữ phiên đăng nhập tại window.BBG_STATE.session.token. Chỉ gọi:
- getBbgVocabularySample({ token, gameMode: 'naval', contentType: 'vocabulary', listClasses: true })
- getBbgVocabularySample({ token, gameMode: 'naval', contentType: 'vocabulary', classCode, listLessons: true })
- getBbgVocabularySample({ token, gameMode: 'naval', contentType: 'vocabulary', classCode, lessonKey })
Tùy chọn bbgCall: { priority: 'interactive' }.

Nguồn tham chiếu: client_93_naval_game.html, server_20_courses.gs:getBbgVocabularySample và brain/modules/academic.yml:naval_game_contract.

Chọn lớp → tối đa 10 buổi học đã ghi nhận gần nhất → chọn buổi học và tự vào game. Host kiểm tra classCode và lessonKey trong danh sách đã tải; đối chiếu cả lessonKey lẫn lessonId đầy đủ ở phản hồi trước khi gửi từ vựng vào iframe. Dữ liệu rows cột 1/2 (từ/nghĩa) hoặc words. Loại từ tiếng Anh trùng mà nghĩa mâu thuẫn, loại nghĩa trùng; yêu cầu ít nhất 4 nghĩa khác nhau. Không dùng câu mẫu khi tải lớp hoặc buổi học lỗi. Một bài chỉ có 4 từ vẫn tạo được bộ câu hỏi và xáo đáp án.

## Thành phần
- zeva-host.html: dialog/card ZEVA, đọc API có phiên, kiểm tra danh sách lớp, hủy khi đổi phiên, từ chối thông điệp giả.
- data-source.js: cầu nối chỉ nhận dữ liệu công khai; tạo trắc nghiệm từ từ vựng.
- artwork.js + island-art.css: nền biển riêng và 11 đảo PNG trong suốt; khói/dung nham, thác nước, lửa trong hang và sóng biển. Tọa độ lấy từ engine, không đổi đường đi. Chỉ đảo đã mở rương chuyển xám; đảo được reset và màn chơi lại trở về màu. Tôn trọng prefers-reduced-motion.
- build-host.cjs: ghép HTML/CSS/JS vào một include Apps Script; hình và font được tải từ nơi lưu asset tĩnh.
- dist/client_treasure_game.html: bản dựng để xem/test. --production đồng thời tạo client_106_treasure_game.html ở root từ hosting.json có mã băm kiểm chứng.

## Dựng include cho môi trường đích
Đưa thư mục assets lên cùng một nơi lưu tĩnh được duyệt. Truyền URL thư mục gốc chứa assets/:
```
node game/dao-kho-bau/build-host.cjs --asset-base https://YOUR-STATIC-HOST/game/dao-kho-bau/
```
Tên miền trong ví dụ là chỗ cần thay bằng nơi lưu thật; công cụ không tự xuất bản, không dùng khóa API.

Luồng phát hành đã dùng ngày 16/10/2026:
```
python tools/publish_treasure_assets.py --publish
node game/dao-kho-bau/build-host.cjs --production
python tools/deploy_treasure_game.py prepare
python tools/deploy_treasure_game.py publish
```
Include tại root:
```html
<?!= include('client_106_treasure_game'); ?>
```
Thẻ có sẵn “Đảo dấu vàng” đã được chuyển thành button mở ztbDialog, bỏ trạng thái Sắp ra mắt. Host dùng lại đúng thẻ data-zeva-game="treasure". Không cần endpoint mới hay thay logic server.

## Phiên và dữ liệu
- Token chỉ ở host, không vào bootstrap/srcdoc, postMessage hoặc localStorage.
- Iframe sandbox allow-scripts; thông điệp phải đúng contentWindow và channel ngẫu nhiên của lần mở.
- Host chỉ cho chọn classCode đã tải. Client kiểm tra nguồn và origin phản hồi.
- Theo dõi thay đổi phiên; đóng game và hủy các phản hồi cũ. Chơi lại tải danh sách/bài học mới.
- Không có request ghi dữ liệu học tập.

## Bố cục chọn lớp và buổi học

Âm thanh ở góc trái, Home ở góc phải; khung riêng ui-picker-frame-clean.png đã bỏ bốn hoa văn bên trong; khi chọn buổi học, Home đổi thành Back để trở lại chọn lớp, kể cả lúc đang tải danh sách/từ vựng. Không còn nút Chọn lớp khác. Bảng chọn cao 748 đơn vị; thanh tìm kiếm rộng 540 đơn vị, đưa lên 12 đơn vị; thẻ lớp/buổi học cao 80 đơn vị, hai cột, đúng ba hàng nhìn thấy. Danh sách cuộn được bằng chuột, chạm và bàn phím nhưng không hiện thanh cuộn. Bỏ các dòng đội/chỉ số/bốc thăm và nút bắt đầu riêng. Mép giày nhìn thấy của hai thuyền trưởng cách mép khung 15 px ở viewport chuẩn, đã tính phần trong suốt của atlas.

Bộ ảnh rời được tạo bằng công cụ imagegen tích hợp, giữ lại trong assets. Prompt và kiểm chứng đợt cập nhật: artifacts/treasure-alignment-20261016. Ảnh map-board-clean.png cũ giữ làm nguồn tham chiếu; runtime dùng ocean-water.png chỉ có nước, map-foreground.png trong suốt đứng yên, cùng island-01-volcano.png đến island-11-cave.png. Nền ocean-background.png cũ chỉ giữ tham chiếu.

Khung chuẩn 1368 × 838 được phủ kín theo chiều cao; các lớp bản đồ dùng chung độ dịch dọc để giữ nguyên tọa độ và tỉ lệ. Thanh HUD và chân trang sát mép trên/dưới. Nhãn đảo mở rộng vùng vẽ để vòng số không bị cắt. Mỗi lần mở/chơi lại, hình đảo, tên và hiệu ứng được xáo cùng nhau trên 11 vị trí đánh số; đồ thị đường đi không đổi. Biển dùng canvas làm gợn toàn bộ ảnh nước riêng, biên độ ngang tối đa 14 đơn vị, cùng các đỉnh sóng sáng; cây/đá có lớp tĩnh riêng ở phía trước. Thác chuyển động bằng texture nước giới hạn trong vùng dòng chảy, dung nham có lõi nóng liên tục chạy theo khe núi; khói gồm 14 cụm xám tối. Chữ ĐẢO KHO BÁU dùng đường cong SVG theo gỗ, số đảo căn theo actualBoundingBox của nét chữ sau khi tải font. Biển ngừng vẽ khi tab ẩn; các hiệu ứng tôn trọng tùy chọn giảm chuyển động.

## Trạng thái nghiệm thu

Bản cập nhật 1109 ngày 17/10/2026, từ bản 1108: thư viện 36 chủ đề, mỗi trận lấy 24 điểm đến (22 đảo thường ngẫu nhiên và hai vùng Kraken/Cá Voi để giữ luật chơi). Thêm Sương Mù, Bão Tố, Bãi Cạn, Băng Trôi, Đá Ngầm, Tuyết, Hoa Quả Sơn, Anh Đào, Thổ Dân, Rắn, Cá Mập và San Hô. Bảy đảo cũ dùng PNG rời độ nét cao; Thác Nước giữ bố cục và thuật toán dòng nước cũ.

`life-effects.js` vẽ chuyển động trên các lớp canvas trong suốt: cua đi ngang và nhấc chân/càng, cá nhỏ quẫy đuôi trong vùng nước dưới rễ, hai lính đi tuần, ba người dân đi lại, chim bay đến/đậu/rời tượng, rắn uốn thân theo vòng đảo, ba cá mập bơi và nổi/lặn, giông với nước cuộn/mây/mưa/vòi rồng/sét. Cùng bộ lập lịch 30 fps của biển; chỉ vẽ cảnh trong viewport, ngừng khi tab ẩn và giữ khung tĩnh khi giảm chuyển động. Nhân vật và nền tách riêng, giữ nguyên ảnh gốc. Các chấm đường đi chạm biên đảo được loại trọn chấm để tránh bị cắt thành nửa vòng; đường cho tàu di chuyển và đồ thị giữ nguyên.

Ảnh tạo bằng imagegen tích hợp, 27 PNG mới/biến thể sử dụng; prompt và nguồn nằm ở `artifacts/treasure-expansion-20261017/asset-prompts.json`. Asset commit `62b039fa3642dbb3c811e37063d10690328f6380`; đã đối chiếu HTTP SHA-256 và CORS cho toàn bộ 27 ảnh mới cùng font. Trang `expansion-preview.html` xem các đảo/hiệu ứng riêng trên HTTP localhost.

Nghiệm thu: 31 kiểm thử Node đạt (bao gồm 1.000 bản đồ về khoảng cách và 100 đồ thị về đường đi), kiểm thử bản đồ chuột/chạm/cuộn vòng, luồng chơi, host thường/production và cả tám hiệu ứng trong iframe sandbox đạt. UI_SHARED đạt. Gate tổng trước/sau đều còn đúng hai lỗi cũ không đổi: thiếu EDU-DATA-ATTENDANCE-CHECKINS và CSS cascade vượt baseline. Chỉ `client_106_treasure_game` thay đổi trên deployment; thẻ game/index và các file live khác giữ nguyên. Biên nhận: `artifacts/treasure-expansion-20261017/deployment/gas-installed.json`.

Bản cập nhật 1098, từ bản 1097: nền ocean-water.png chỉ chứa biển; cây/đá/hoa ở map-foreground.png đứng yên; khung picker sạch, kéo xuống thêm 38 đơn vị; tìm kiếm ngắn và cao hơn; số đảo căn tâm nét chữ; tiêu đề cong theo bảng gỗ; khói dày tối hơn, nước thác chạy bằng texture và dung nham liên tục. Ảnh tạo bằng imagegen tích hợp, prompt và đường dẫn lưu tại artifacts/treasure-ocean-layers-20261016/asset-prompts.json. Asset commit e979ffcd7951ce8f1496f6e388609fc60eaef9f5, đã đối chiếu HTTP SHA-256 ba ảnh mới. Kiểm tra 1368 × 838: 7.711 pixel trong cây/đá không đổi giữa khung hình; 11 số lệch tâm dưới 1 px; giày–khung 15 px; chuyển động 49 khung/1,6 giây. 26 test logic, host production, browser gameplay và UI_SHARED đạt. Gate tổng còn hai lỗi cũ với số liệu không đổi (attendance data index và CSS cascade). Chỉ client_106_treasure_game thay đổi trên deployment; receipt nằm trong thư mục artifacts cùng đợt.

Bản cập nhật 1095 ngày 16/10/2026, từ bản 1094: thẻ lớp/buổi học ngắn hơn và cao hơn, đúng ba hàng; âm thanh góc trái, Home/Back góc phải, bỏ nút Chọn lớp khác; phủ kín chiều cao 1368 × 838; vòng số đảo đầy đủ; xáo các đảo mỗi lần mở/chơi lại; biển, thác và dung nham chuyển động theo artwork. Chỉ client_106_treasure_game đổi trên deployment. 26 kiểm thử logic, host production, browser, giảm chuyển động, căn đúng 11 đảo và chuyển động biển đều đạt (41 lần cập nhật trong 2 giây trên máy kiểm tra). UI_SHARED đạt. Gate --all còn đúng hai lỗi cũ với số liệu không đổi: chỉ mục chuyên cần và CSS cascade. Biên nhận: artifacts/treasure-picker-sizing-20261016/deployment/gas-installed.json.

Bản cập nhật 1093 ngày 16/10/2026, từ bản 1092: căn giữa ở 1368 × 838, chọn lớp/buổi học rồi vào game, hai nút Home/âm thanh, khoảng hở giày 15 px, biển và 11 đảo rời với hiệu ứng và trạng thái xám. Chỉ client_106_treasure_game thay đổi trên deployment; index và các file live khác giữ nguyên. Asset commit: 7d2217db52b930032055948c4bafbf65986a50de. Đã đối chiếu SHA-256 qua HTTP cho 12 ảnh mới; 26 kiểm thử logic, browser và host (cả production include) đạt. UI_SHARED và ACADEMIC đạt. Gate --all vẫn có hai lỗi cũ ngoài phạm vi, cùng số liệu trước/sau: chỉ mục chuyên cần và CSS cascade. Biên nhận: artifacts/treasure-alignment-20261016/deployment/gas-installed.json.

Lịch sử tích hợp ban đầu:
Đã phát hành Apps Script phiên bản 1070 ngày 16/10/2026, từ bản 1069. Candidate chỉ đổi index (thẻ và include) cùng client_106_treasure_game; các file live khác được giữ nguyên và kiểm tra bằng API.
Ảnh/phông chữ dùng GitHub commit a8f8ab0a746e274d91c3aab9d3c47c66d13be64e, thư mục gamedaokhobau/assets. 20 tệp đã được tải từ URL công khai và đối chiếu SHA-256.
Kiểm thử host dùng chính button trong index, mở bằng bàn phím, không sinh thẻ trùng; kiểm tra API có phiên, đổi phiên và phản hồi muộn đạt. Quan sát trực tiếp trên Chrome xác nhận danh sách lớp thật và màn chơi hiện trong ZEVA. Không thao tác ghi điểm học tập.
Brain ACADEMIC đạt. Gate --all còn lỗi ngoài phạm vi thay đổi này: thiếu EDU-DATA-ATTENDANCE-CHECKINS trong chỉ mục dữ liệu và CSS cascade vượt baseline; không sửa các stylesheet/schema liên quan trong đợt này.
Biên nhận phát hành: artifacts/dao-kho-bau-live-20261016/deployment/gas-installed.json.

Bản cập nhật1111 ngày17/10/2026, từ1110: trang expansion-preview.html hiển thị đủ36 chủ đề, có tìm tên, lọc ảnh tĩnh/hiệu ứng và bật/tạm dừng. Thư viện vẫn chọn24 điểm đến mỗi trận; luật Kraken/Cá Voi và dữ liệu lớp/buổi học giữ nguyên. Đã xác nhận deployment chỉ thay client_106_treasure_game; biên nhận deployment/gas-installed.json.

atmosphere-effects.js dùng các lớp canvas riêng cho sương dày nhiều tầng, tuyết lớn/dày, sóng tiến vào chân đá rồi vỡ bọt, ba thác mới (Hoa Quả Sơn, Anh Đào, Thổ Dân), cánh hoa, san hô, phản chiếu trên mặt pha lê, đèn hải đăng xoay, bụi sáng đảo nấm, hơi thở rồng tỏa ngang và mây/sét nhiều vị trí. Dòng dung nham có lõi nóng và lớp che theo màu của khe núi. Thác Nước nguyên bản giữ bố cục và thuật toán cũ.

life-effects.js: cá nhỏ được che bởi mặt nạ nước nên không vẽ đè lên cầu/rễ/bờ; rắn có đường trườn liên tục theo chiều dài thân; cá mập quẫy đuôi và chìm/nổi; cư dân cầm cung/giáo đi trên các đường riêng. Vịnh Ngọc Trai đổi thành Vịnh Tiên Cá, có hai tư thế ảnh riêng cho bơi/ngồi và nốt nhạc bay lên. Ba chim cánh cụt đi trên băng; hai khỉ bám cành, leo cây và nghỉ. Ảnh Hoa Quả Sơn bỏ khỉ tĩnh, dùng alpha ảnh gốc khi hiển thị để giữ mép cây sạch. Vùng Cá Voi vẽ đàn bốn con lớn nhỏ, nổi/lặn lệch pha, phun nước, phần thân chìm dần dưới mặt nước; giảm chuyển động vẫn hiện cả đàn ở khung tĩnh.

Kiểm chứng đợt này: 29 kiểm thử Node về logic/đồ thị/thư viện đạt; bản đồ chuột/chạm/cuộn vòng, luồng chơi, 29 chủ đề có chuyển động, che cá đúng vùng nước, mật độ sương/tuyết, tìm kiếm/lọc/tạm dừng và iframe sandbox CORS đạt. Kiểm thử Kraken/Cá Voi và host production đạt. UI_SHARED đạt. Gate tổng trước/sau còn đúng hai lỗi cũ không đổi: thiếu EDU-DATA-ATTENDANCE-CHECKINS và CSS cascade vượt baseline (5595/237/634/73/48/146/27). Không thay bố trí/đường đi; bộ 1000 bản đồ đã đạt ở đợt1109 không chạy lại. Asset commit2c2321a54ac74398b3c583d0f3ad83c611087c6a; kiểm tra SHA-256 và CORS của11 file mới/font đạt. Prompt, ảnh kiểm chứng, báo cáo và biên nhận đặt trong artifacts/treasure-living-world-20261017.


Cập nhật cục bộ 20/10/2026 — giá bán, nâng cấp và giao chiến đảo:
- Tài nguyên thường 2 vàng, quý 5 vàng; chiến lợi phẩm giữ 300. Thân tàu Lv0 khai thác 25 đơn vị/ngày, mỗi cấp +25 cho cả thường và quý. Năm mô tả nâng cấp dùng câu người dùng chốt.
- Đảo chiến đấu 100 độ bền, 10 sát thương. Pha ISLAND_BATTLE khóa hành động; effects.playIslandBattle chạy trên map trước khi engine tự phân thắng thua. Đòn kết liễu không phản công, giáp/khiên vẫn áp dụng. Thắng hiển thị ảnh/tên sản vật, kết quả độ bền và nút Tiếp tục hành trình; thua giữ luật kết thúc trận hiện có. Hủy về trang đầu không cập nhật trận cũ.
- Tên đảo vàng/đỏ/đen/xanh dương theo kho báu/chiến đấu/thường/quý. Nút báo lượt ngắn 410px, la bàn sát đầu 12px; Đỏ nền đỏ, Xanh viền xanh dương.
- Build include production dùng tài sản đã có; không có tài sản mới cần phát hành. Chưa triển khai live. Mask nước cảng vẫn là bản xem trước chờ người dùng duyệt, không thay port-water.js.

Bổ sung cục bộ 20/10/2026 — đã áp dụng mặt nước hai cảng:
- Yêu cầu mới của người dùng cho phép áp dụng vùng nước review vào port-water.js. Không còn chờ duyệt mask: thay polygon thô bằng contour chi tiết, dùng chung cho lớp sóng và lớp trước thân tàu, lấy mẫu chỉ từ màu nước. Ảnh gốc không đổi.
- Nút lượt đội bỏ la bàn/vòng xanh, căn giữa chữ. Đổi riêng màu nền xanh thành đỏ bằng SVG filter ngay trên ảnh nút để không tràn viền vàng; URL filter trỏ vào tài liệu hiện tại, kể cả iframe srcdoc có remote base.
- PASS pixel QA hai cảng × bốn viewport: 0 pixel nước bị thiếu so với mask, 0 pixel tràn lên phần ngoài mặt nước ở cả hai layer. PASS shipyard browser, combat browser, production host smoke và UI_SHARED.
- Build production include cục bộ; không triển khai live trong đợt này. Báo cáo/ảnh/ZIP: artifacts/treasure-harbor-water-20261020/.


## Đợt tiếp nối 2026-10-20 — lương thực dưới 70%, ô số lượng và icon khai thác
- Theo yêu cầu mới, chỉ tự dùng tài nguyên ăn được trong kho khi khẩu phần vẫn thiếu sau thực phẩm mới/dự trữ và độ bền hiện tại dưới 70%. Xét tỷ lệ thực trước khi trừ cuối ngày; đúng 70% chưa tự ăn. Đủ phần thiếu thì giữ nguyên độ bền, ưu tiên thường trước quý; không đủ thì không trừ hàng lẻ và vẫn chịu hao độ bền do đói theo luật cũ.
- Kho hàng đầy vẫn khai thác tài nguyên ăn được ở mọi mức độ bền: dùng cho hôm nay trước, phần dư bổ sung kho lương và giữ phần ngày lẻ. Tài nguyên không ăn được vẫn cần chỗ trống. Kết quả hiển thị rõ khẩu phần và lượng bổ sung kho lương; cập nhật luật/cảnh báo. Mở Luật hải trình từ Chiến thuyền.
- Gian thương: reset margin/border/radius/shadow của ô nhập để con số nằm phẳng giữa −/+; chỉnh crop atlas để phần vẽ nút Bán rộng bằng ô số lượng. Giữ nhập số, cộng/trừ, kiểm tra lượng bán và khóa cửa hàng xem trước.
- Thêm icon cuốc SVG nội tuyến và tốc độ khai thác 25/50/75/100 theo cấp Thân tàu vào HUD hai đội; dùng chung công thức với engine. Chi tiết tàu có chỉ số này, vùng nội dung cuộn nằm trong giấy.
- PASS: 82 kiểm thử engine/trade/harvest/passage/voyage/island-combat/victory/treasure, gồm ngưỡng 69/70/71% trên hai đội và bốn mức độ bền tối đa, hết hàng sau nhiều ngày và khai thác thực phẩm khi đầy kho. Trình duyệt HUD/food đạt hai đội và bốn viewport; shipyard đạt mua/bán, thay đổi số lượng, nâng cấp, thiếu ảnh, hai cảng; host production đạt; UI_SHARED đạt. Đã xem ảnh thật ô số lượng, HUD, kết quả thực phẩm và chi tiết tàu.
- Đã build --production lại dist/client_treasure_game.html và client_106_treasure_game.html. Không có asset raster mới cần publish. Bản cập nhật cục bộ, chưa triển khai live. Backup, bằng chứng và ZIP tại artifacts/treasure-food-merchant-harvest-20261020/.


## Đợt tiếp nối 2026-10-20 — bảo vệ lần đầu, máu đảo tích lũy và cân chỉnh kinh tế
- Chốt theo yêu cầu cuối: mọi đảo chiến đấu có 500 độ bền/10 sát thương; chiến lợi phẩm độc nhất bán 1.000 vàng. Kraken có 1.000 độ bền/30 sát thương. Tài nguyên thường bán 1 vàng, quý vẫn 5 vàng. Giá mọi nâng cấp theo cấp hiện tại: Lv0→1: 100, Lv1→2: 500, Lv2→3: 1.000 vàng; tối đa vẫn Lv3. UI hiển thị đúng giá kế tiếp, trừ đúng vàng và khóa khi thiếu tiền/đạt tối đa.
- Mỗi tàu lưu số lần tấn công quái vật kể từ khi sửa ở cảng. Lần đầu nếu trận đảo có thể làm tàu chìm, tính giáp/khiên/thứ tự bắn rồi tự ngừng ở đúng 30% độ bền tối đa. Nếu tàu vốn dưới 30%, không hồi máu mà giữ ngưỡng bằng độ bền lúc bắt đầu. Trận thắng được vẫn tiếp tục kể cả kết thúc dưới 30%. Tấn công tiếp trước khi sửa không được chặn sát thương chí mạng. PvP/thiếu lương thực giữ luật riêng.
- Kraken vẫn một lần bắn/phản đòn trên mỗi lần chọn tấn công; nếu phản đòn đầu sau sửa cảng có thể gây chìm thì áp dụng ngừng đánh. Không đổi sang đánh Kraken tự động cả trận.
- Cập Dover hoặc Bristol: hồi đầy tàu, tiếp tế và reset bộ đếm tấn công của riêng đội đó. Không hồi độ bền đảo/Kraken. Máu mục tiêu đã mất giữ qua rút lui, đổi đội, sang ngày và đi sửa. Chỉ trao loot khi hạ đảo. Kịch bản tàu Lv3 hợp lệ: đảo 500→220 khi tàu dừng ở 60/200; về sửa rồi quay lại hạ 220 máu còn lại, tàu còn 100/200 và bán loot được 1.000 vàng.
- UI ngừng giao tranh có ảnh đảo/quái vật, độ bền tàu/mục tiêu hiện tại, lời nhắc về sửa, chưa nhận loot và nút Tiếp tục hành trình. Cập nhật luật chơi, thông số Kraken, kho chiến lợi phẩm, gian thương và xưởng.
- PASS: 92 kiểm thử gameplay/kinh tế (82 hồi quy + 10 bảo vệ/giá nâng cấp); browser combat gồm ngừng lần đầu, chết lần tiếp, máu đảo giữ lại, Kraken 1000/30, bốn viewport; shipyard gồm bán 1/5/1000 và nâng 100/500/1000 cả hai đội; host production và UI_SHARED đạt. Đã xem ảnh thật kết quả rút lui, Kraken và giá nâng cấp.
- Đã build --production lại include root và dist. Không đổi/publish asset raster; chưa triển khai live. Backup, báo cáo, ảnh và ZIP ở artifacts/treasure-combat-retreat-20261020/.

- Bổ sung cuối đợt: giới hạn tăng lên 60 lượt đầy đủ cho mỗi đội (120 lượt luân phiên); HUD, luật, kết quả dùng TURN_LIMIT. Kiểm thử hai thứ tự bắt đầu xác nhận lượt 119 chưa kết thúc và lượt 120 phân thắng bằng vàng; giữ điều kiện kết thúc sớm do tàu chìm/Kraken.


## Đợt tiếp nối 2026-10-20 — khẩu phần hai đội, icon tiêu thụ và gian thương
- Mỗi tàu có mức khẩu phần kho hàng riêng. Khi thiếu lương thực, chỉ dùng sản vật ăn được trong kho ở độ bền còn 70% trở xuống (thay ngưỡng dưới 70% cũ). Sau mỗi ngày thực sự dùng hàng trong kho, mức cho ngày đầy đủ tiếp theo tăng 25%, làm tròn lên: 20 → 25 → 32 → 40 → 50… ở Kho hàng Lv0. Ngày không dùng hàng/không đủ hàng không tăng và không reset. Theo xác nhận của người dùng, chỉ về Dover hoặc Bristol tiếp tế mới đặt lại khẩu phần của tàu ghé cảng.
- Thực phẩm mới khai thác vẫn bù khẩu phần cơ bản hôm nay trước, phần dư cất kho hàng rồi mới bổ sung kho lương; giữ phần ngày lẻ. Khai thác thực phẩm được khi kho đầy ở mọi mức độ bền. Nếu thực phẩm mới/dự trữ chỉ bù một phần ngày, phần còn thiếu lấy theo tỷ lệ khẩu phần kho hàng hiện tại, làm tròn lên. Không đủ hàng thì giữ nguyên hàng và chịu hao độ bền theo luật hiện có. Cả hai đội dùng chung logic, trạng thái và mức tăng độc lập.
- Thêm icon đĩa thức ăn SVG nội tuyến vào HUD cả hai đội, hiện mức tiêu thụ kho hàng kế tiếp, đồng bộ với chi tiết tàu. Năm ô chỉ số vẫn cân đối và đối xứng ở bốn viewport. Cập nhật luật hải trình và cảnh báo cuối ngày.
- Đổi gian thương Bristol thành Baltazar Râu đen, Dover thành Barnaby bụng bự. Theo bổ sung cuối, bỏ toàn bộ nhãn Giá cố định/Giá cao/Giá thấp/Được giá; cửa hàng chỉ hiện Giá bán và số vàng. Các giá 1/5/1.000 giữ nguyên.
- PASS: 98 kiểm thử gameplay/kinh tế (gồm 6 ca mới cho luân phiên hai đội, hai thứ tự bắt đầu, khẩu phần tăng, phần ngày lẻ, đi biển và reset ở cả hai cảng); 16 ca food/trade chạy lại sau chỉnh helper mặc định. HUD/food browser kiểm tra cả hai đội, ngưỡng 70%, 20→25→32→40, icon/reset, đầy kho và bốn viewport. Shipyard browser đạt hai tên mới, giá chỉ còn số vàng, mua/bán/nâng cấp và hao lương. Host production và UI_SHARED đạt. Đã xem ảnh thật HUD desktop/mobile, chi tiết tàu và hai gian thương.
- Build --production đã sinh lại client_106_treasure_game.html và dist/client_treasure_game.html. Không có asset raster mới; bản cục bộ, chưa triển khai live. Backup/báo cáo/ảnh và ZIP tại artifacts/treasure-food-both-teams-20261020/.


## Đợt tiếp nối 2026-10-20 — khung nút thử thách và dòng vàng khi sai
- Nút Trả lời/Di chuyển/Kết thúc ngày trong thử thách đảo dùng cùng chiều rộng 300 world px, chiều cao theo tỷ lệ crop gốc 1254:310. Giữ tỷ lệ ảnh nền và lấy đủ mép viền xanh để hai đầu bo không bị ép ngang; chữ căn giữa. Không đổi ảnh gốc hoặc nút chọn đáp án.
- Theo yêu cầu bổ sung, bỏ dòng trừ vàng/còn vàng dưới đáp án khi trả lời sai, bao gồm trường hợp −0 vàng · Còn 0 vàng. Quy tắc trừ một nửa vàng và số vàng trên HUD vẫn giữ nguyên.
- PASS passage-browser: bốn viewport; tỷ lệ và kích thước khung đồng nhất trước/sau trả lời; chọn rồi trả lời; trả lời đúng mở di chuyển; sai khi có 100 vàng và khi có 0 vàng đều không hiện dòng vàng. Đã xem ảnh Trả lời, Di chuyển và Kết thúc ngày. UI_SHARED đạt.
- Build production sinh lại client_106_treasure_game.html và dist/client_treasure_game.html. Bản cục bộ, chưa triển khai live. Backup, ảnh, báo cáo và ZIP tại artifacts/treasure-challenge-buttons-20261020/.

## Âm thanh Đảo Kho Báu — 2026-10-20
- Nhập nguyên bản 11 file do người dùng đặt tên từ Downloads/audio vào audio/. manifest.json lưu kích thước và SHA-256; hosting.json ghim URL GitHub theo commit bất biến 79f0af5fb214f7b066d202f060eb3c2f835f337c.
- Ghép sự kiện: bấm nút/di chuột qua nút; nhạc nền lặp ở màn chọn và trận đấu; Trả lời đúng/trả lời sai; thuyền di chuyển khi đổi đảo; đánh nhau hỗ loạn khi giao tranh; mua bán sau bán thành công; mở rương sau mở thành công; chiến thắng khi kết thúc trận.
- Nâng cấp thành công phát file nâng cấp.mp3 MỘT LẦN. File mới đã có tiếng búa theo mong muốn, không có timer phát ba lần hoặc lặp cách 0,5 giây.
- Giữ mặc định tắt âm hiện có: bấm biểu tượng loa để bật. Âm lượng nền 20%; tắt tiếng, ẩn tab hoặc đóng game sẽ dừng/tạm dừng nhạc và hiệu ứng phù hợp. Giới hạn hiệu ứng đồng thời, không nhân đôi tiếng kết quả khi render lại.
- build-host.cjs --production kiểm tra hash mọi file âm thanh và thay đường dẫn audio tương đối bằng URL GitHub đã ghim; audio.js chạy trước game.js.
- Bản live được ghép riêng phần âm thanh trên snapshot version 1151; giữ CSS nút thử thách, dòng vàng khi sai và host shell của live. zeva-include.html trên GitHub là bản live đã đối chiếu; build từ nguồn canonical cục bộ vẫn chứa các chỉnh sửa giao diện đang chờ của đợt trước.
- PASS 14 unit tests audio/treasure/victory; audio-browser trong iframe sandbox giải mã đủ 11 file từ GitHub và kiểm tra nâng cấp một lần, bán hàng, mở rương, đáp án và kết quả; production host smoke PASS; brain_validate --module ui_shared PASS. Gate --all còn lỗi chỉ mục attendance và ngưỡng CSS có từ trước, không thuộc thay đổi âm thanh.
- Đã triển khai và xác nhận Apps Script version 1152; chỉ client_106_treasure_game thay đổi, các file live khác giữ nguyên.
