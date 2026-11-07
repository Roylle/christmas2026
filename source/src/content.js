// Nội dung thật của sự kiện, dùng chung cho cảnh 3D và các tấm giấy mở ra khi chạm.
export const BUY = 'https://orchestars.vn/events/ttc2026'
export const MAP = 'https://www.google.com/maps/dir/?api=1&destination=Renaissance+Riverside+Hotel+Saigon+8-15+Ton+Duc+Thang'

export const data = {
  // Ảnh to nhỏ xen kẽ. x, top là vị trí mép trên; rope = treo trên dây, không thì dán băng keo lên tường.
  photos: [
    { src: 'm-01', caption: 'Cả khán phòng', x: 50.4, top: 7.05, s: 1.32, rope: true },
    { src: 'm-14', caption: 'Chào đón Giáng Sinh', x: 55.6, top: 7.05, s: 0.62, rope: true },
    { src: 'm-05', caption: 'Mùa lễ hội', x: 55.5, top: 4.62, s: 0.62, tape: -0.05 },
    { src: 'm-13', caption: 'Trên sân khấu', x: 59.1, top: 7.05, s: 1.24, rope: true },
    { src: 'm-02', caption: 'Những giọng ca nhỏ', x: 63.3, top: 7.05, s: 0.88, rope: true },
    { src: 'm-12', caption: 'Kỷ niệm gia đình', x: 62.3, top: 3.82, s: 0.48, tape: 0.06 },
    { src: 'm-04', caption: 'Thanh âm giao hưởng', x: 64.8, top: 3.76, s: 0.48, tape: -0.04 },
    { src: 'm-group', caption: 'Cùng lưu kỷ niệm', x: 68.9, top: 7.05, s: 1.32, rope: true },
    { src: 'm-16', caption: 'Trong ánh đèn ấm', x: 73.4, top: 7.05, s: 0.72, rope: true },
    { src: 'm-08', caption: 'Hợp xướng thiếu nhi', x: 73.5, top: 4.0, s: 0.46, tape: 0.05 },
    { src: 'm-06', caption: 'Sân khấu rực rỡ', x: 76.8, top: 7.05, s: 0.72, rope: true },
    { src: 'm-07', caption: 'Lời chào sau đêm nhạc', x: 76.9, top: 4.42, s: 0.5, tape: -0.05 },
  ],
  albums: [{ src: 'album-ttc' }, { src: 'album-disney' }, { src: 'album-aot' }, { src: 'album-ghibli' }],
  tickets: [
    { name: 'First Class', price: '1.800.000đ', kind: 'Ngồi' },
    { name: 'Premium', price: '1.200.000đ', kind: 'Ngồi' },
    { name: 'Eco', price: '800.000đ', kind: 'Ngồi' },
    { name: 'Standing', price: '200.000đ', kind: 'Đứng' },
  ],
  faq: [
    { q: 'Chương trình có phù hợp với trẻ em không?', a: 'Chương trình chào đón gia đình và trẻ nhỏ. Trẻ từ 3 tuổi trở lên cần có vé riêng. Trẻ dưới 3 tuổi được ngồi trên lòng người lớn.' },
    { q: 'Tôi mua vé và chọn vị trí như thế nào?', a: 'Xem các hạng vé và sơ đồ khán phòng tại đây, sau đó mở “Mua vé” để chọn suất diễn, vị trí và hoàn tất đặt vé trên hệ thống OrcheStars.' },
    { q: 'Tôi cần đến lúc mấy giờ?', a: 'Check-in từ 17:15 cho suất 18:00; từ 19:45 cho suất 20:30. Bạn nên đến trước giờ diễn ít nhất 30 phút. Ban tổ chức ngừng nhận check-in lúc 18:15 hoặc 20:45, tương ứng từng suất.' },
    { q: 'Tôi cần mang gì để check-in?', a: 'Vui lòng xuất trình email kèm vé điện tử chính thức do OrcheStars gửi. Ban tổ chức không chấp nhận ảnh chụp màn hình hoặc ảnh chụp vé.' },
    { q: 'Vé có được đổi hoặc hoàn tiền không?', a: 'Theo điều khoản của chương trình, vé đã mua không được đổi, trả, chuyển nhượng hoặc hoàn tiền. Vui lòng kiểm tra kỹ ngày và suất diễn trước khi thanh toán.' },
    { q: 'Tôi có thể chụp ảnh hoặc quay phim không?', a: 'Không sử dụng máy quay chuyên dụng, livestream hoặc chụp ảnh có đèn flash trong buổi diễn. Vui lòng làm theo hướng dẫn của ban tổ chức và giữ không gian thưởng thức chung.' },
  ],
}

// Bảy chương trên hành trình. x là vị trí camera khi dừng ở chương đó.
export const LOOP = 204
export const chapters = [
  { id: 'open', label: 'Mở đầu', x: 0, from: 190, to: 14, ride: 'sled' },
  { id: 'two', label: 'Hai mùa', x: 21, from: 14, ride: 'horse' },
  { id: 'frames', label: 'Khung hình', x: 46, from: 39, ride: 'walk' },
  { id: 'stories', label: 'Câu chuyện', x: 90, from: 80, ride: 'walk' },
  { id: 'tickets', label: 'Vé', x: 127, from: 100, ride: 'walk' },
  { id: 'venue', label: 'Địa điểm', x: 146, from: 138, ride: 'cyclo' },
  { id: 'faq', label: 'Hỏi đáp', x: 168, from: 158, ride: 'sled' },
]

export const biomes = [
  { x: 0, color: '#eef2f7' },
  { x: 14, color: '#f6c9bf' },
  { x: 28, color: '#6d78ab' },
  { x: 41, color: '#e8c79a' },
  { x: 80, color: '#b9d8a4' },
  { x: 100, color: '#d75a58' },
  { x: 130, color: '#8cc4dd' },
  { x: 146, color: '#c0c3cb' },
  { x: 156, color: '#d9d0ef' },
  { x: 184, color: '#eef2f7' },
]
