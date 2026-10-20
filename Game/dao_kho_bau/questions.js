// Bộ câu hỏi tiếng Anh mẫu, thay bằng JSON riêng trong màn chuẩn bị.
(function(root){
  'use strict';
  const rows = [
    ['“Treasure” nghĩa là gì?', ['Kho báu','Ngọn núi','Con tàu','Cơn bão'],0,'Treasure có nghĩa là kho báu.'],
    ['Chọn từ chỉ “hòn đảo”.', ['River','Island','Forest','Cloud'],1,'Island là hòn đảo.'],
    ['Điền từ: She ___ a student.', ['am','are','is','be'],2,'She đi với is.'],
    ['Số nhiều của “child” là gì?', ['childs','childes','childrens','children'],3,'Child có dạng số nhiều bất quy tắc là children.'],
    ['Từ trái nghĩa với “big” là gì?', ['small','tall','long','strong'],0,'Big: to; small: nhỏ.'],
    ['Điền từ: I have ___ apple.', ['a','an','thee','many'],1,'Dùng an trước âm nguyên âm của apple.'],
    ['“Compass” nghĩa là gì?', ['Mỏ neo','Cánh buồm','La bàn','Đại bác'],2,'Compass là la bàn.'],
    ['Quá khứ của “go” là gì?', ['goed','gone','going','went'],3,'Go → went ở thì quá khứ đơn.'],
    ['Chọn câu đúng.', ['He likes music.','He like music.','He liking music.','He are music.'],0,'He/she/it dùng động từ thêm s trong hiện tại đơn.'],
    ['“Blue” là màu gì?', ['Đỏ','Xanh dương','Vàng','Trắng'],1,'Blue là xanh dương.'],
    ['Điền từ: There ___ two ships.', ['is','am','are','be'],2,'Two ships là số nhiều, dùng are.'],
    ['Từ nào có nghĩa là “khám phá”?', ['Sleep','Close','Forget','Explore'],3,'Explore có nghĩa là khám phá.'],
    ['Từ trái nghĩa với “hot” là gì?', ['cold','warm','sunny','dry'],0,'Hot: nóng; cold: lạnh.'],
    ['Chọn giới từ: The book is ___ the table. (trên bàn)', ['under','on','behind','between'],1,'On nghĩa là ở trên bề mặt.'],
    ['“Waterfall” nghĩa là gì?', ['Bãi biển','Núi lửa','Thác nước','Hang động'],2,'Waterfall là thác nước.'],
    ['Điền từ: We ___ playing a game now.', ['is','am','be','are'],3,'We are playing: chúng tôi đang chơi.'],
    ['Số nhiều của “foot” là gì?', ['feet','foots','feets','footies'],0,'Foot → feet.'],
    ['“Lighthouse” là gì?', ['Nhà kho','Ngọn hải đăng','Cầu cảng','Tượng đá'],1,'Lighthouse là ngọn hải đăng.'],
    ['Điền từ: He can ___ very fast.', ['runs','running','run','ran'],2,'Sau can dùng động từ nguyên mẫu.'],
    ['Một tuần có bao nhiêu ngày?', ['Five','Six','Eight','Seven'],3,'Seven days: bảy ngày.'],
    ['“Brave” có nghĩa là gì?', ['Dũng cảm','Mệt mỏi','Chậm chạp','Ồn ào'],0,'Brave: dũng cảm.'],
    ['Điền từ: This is ___ ship. (con tàu của chúng tôi)', ['we','our','us','ours'],1,'Our là tính từ sở hữu, đứng trước danh từ.'],
    ['Từ nào chỉ một loài động vật?', ['Stone','Gold','Crab','Sand'],2,'Crab là con cua.'],
    ['Chọn câu hỏi đúng.', ['Where you live?','Where does you live?','Where are you live?','Where do you live?'],3,'Where do you live? Bạn sống ở đâu?'],
    ['“Find” nghĩa là gì?', ['Tìm thấy','Đánh mất','Bỏ quên','Đóng lại'],0,'Find là tìm thấy.'],
    ['Dạng so sánh hơn của “good” là gì?', ['gooder','better','best','more good'],1,'Good → better → best.'],
    ['Điền từ: Yesterday, they ___ to the beach.', ['go','goes','went','going'],2,'Yesterday là dấu hiệu quá khứ; go → went.'],
    ['“Sail” có thể có nghĩa là gì?', ['Chạy bộ','Leo núi','Đào đất','Đi thuyền buồm'],3,'Sail: đi thuyền buồm; cũng là cánh buồm.'],
    ['Từ trái nghĩa với “win” là gì?', ['lose','find','open','start'],0,'Win: thắng; lose: thua.'],
    ['Điền từ: How ___ coins do you have?', ['much','many','any','a'],1,'Coins đếm được số nhiều, dùng how many.'],
    ['“Shield” nghĩa là gì?', ['Thanh kiếm','Khẩu pháo','Cái khiên','Mái chèo'],2,'Shield là cái khiên.'],
    ['Từ nào có nghĩa là “cùng nhau”?', ['Alone','Never','Slowly','Together'],3,'Together: cùng nhau.']
  ];
  root.TreasureQuestions=rows.map(([text,options,answer,explanation])=>({text,options,answer,explanation}));
})(typeof globalThis!=='undefined'?globalThis:this);
