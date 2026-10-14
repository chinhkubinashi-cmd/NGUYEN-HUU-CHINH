# Kế hoạch Triển khai: Quản lý Thư viện Truyện (Đang viết / Đã hoàn thành) & Chia sẻ Dự án qua Tài khoản Khác

## 1. Mục tiêu
- **Phân loại tác phẩm**: Bổ sung trường trạng thái (`status: 'in_progress' | 'completed'`) vào dữ liệu truyện, kết hợp tự động nhận diện (dựa trên tiến độ dàn ý và số chương hoàn thiện) và chuyển đổi thủ công chỉ bằng 1 thao tác.
- **Bộ lọc thư viện**: Hiển thị bộ lọc trong Thư viện (Tất cả, Đang viết, Đã hoàn thành) kèm thống kê số lượng và huy hiệu trực quan trên từng thẻ truyện.
- **Chia sẻ & Chuyển giao dự án giữa các tài khoản**: 
  - Cho phép xuất từng truyện riêng lẻ hoặc toàn bộ thư viện thành file `.json`.
  - Hỗ trợ tạo **Mã chia sẻ (Share Code)** có thể sao chép và dán trực tiếp sang tài khoản khác mà không cần tải file về máy.
  - Hỗ trợ nút **Nhập truyện / Nhập mã chia sẻ** ngay tại Thư viện (Dashboard) và Cài đặt, tự động xử lý trùng lặp (ghi đè hoặc nhân bản thành truyện mới) để tiếp tục sáng tác liền mạch trên tài khoản mới khi tài khoản cũ hết quota Gemini.

---

## 2. Thiết kế chi tiết & Thay đổi mã nguồn

### A. Cập nhật Model Dữ liệu (`types.ts`)
- Mở rộng kiểu dữ liệu `StoryProject`:
  - `status?: 'in_progress' | 'completed'`: Trạng thái sáng tác.
  - `updatedAt?: number`: Thời điểm cập nhật gần nhất.
  - Cập nhật hàm khởi tạo mặc định trạng thái là `'in_progress'`.

### B. Nâng cấp Thư viện & Bảng điều khiển (`components/Dashboard.tsx`)
1. **Thanh công cụ Thư viện**:
   - Thêm Tabs lọc trạng thái: **Tất cả**, **Đang sáng tác** (kèm đếm số lượng), **Đã hoàn thành** (kèm đếm số lượng).
   - Thêm nút hành động nhanh: **Nhập truyện (File / Mã)** ngay cạnh nút **Bắt đầu dự án mới**.
2. **Thẻ truyện (Story Card)**:
   - Hiển thị nhãn trạng thái trực quan:
     - 🟡 **Đang sáng tác** (hiển thị tiến độ chương/dàn ý: ví dụ 3/5 chương).
     - 🟢 **Đã hoàn thành**.
   - Nút chuyển nhanh trạng thái (click để đánh dấu Đã hoàn thành hoặc Tiếp tục sáng tác).
   - Menu hành động nhanh trên thẻ:
     - **Chia sẻ / Xuất truyện**: Mở modal xuất file JSON hoặc sao chép Mã chia sẻ trực tiếp.
     - **Xóa truyện**.
3. **Modal Nhập truyện & Mã chia sẻ (Import & Share Modal)**:
   - Cho phép kéo thả / chọn file `.json`.
   - Hoặc dán trực tiếp chuỗi Mã chia sẻ (Base64 json).
   - Tự động nhận dạng truyện đơn lẻ hoặc toàn bộ thư viện, lưu ngay vào `localStorage` và chuyển đến màn hình viết nếu muốn.

### C. Bổ sung tính năng Chia sẻ trong Trình soạn thảo (`components/StoryEditor.tsx`)
- Thêm nút chuyển đổi trạng thái truyện ("Đánh dấu hoàn thành" / "Đang viết dở") ngay trên thanh công cụ của Trình soạn thảo.
- Thêm nút **Chia sẻ dự án** trên thanh công cụ: click vào là copy ngay mã chia sẻ hoặc tải file dự án để nhanh chóng gửi sang tài khoản khác tiếp tục viết.

### D. Nâng cấp phần Dữ liệu trong Cài đặt (`components/Settings.tsx`)
- Bổ sung tùy chọn sao lưu toàn bộ thư viện hoặc tải lên khôi phục dữ liệu an toàn.

---

## 3. Các bước kiểm thử & Xác thực
1. Kiểm tra tạo truyện mới -> mặc định là "Đang sáng tác".
2. Thử nghiệm đổi trạng thái sang "Đã hoàn thành" cả ở Thư viện và trong màn hình Soạn thảo.
3. Kiểm tra các bộ lọc "Tất cả", "Đang sáng tác", "Đã hoàn thành".
4. Thử nghiệm tính năng Xuất file JSON của 1 truyện và tạo Mã chia sẻ.
5. Thử nghiệm tính năng Nhập file / Dán mã chia sẻ: truyện được thêm vào thư viện đầy đủ nhân vật, dàn ý, các chương đã viết.
6. Chạy `lint_applet` và `compile_applet` đảm bảo mã nguồn chuẩn xác, không có lỗi.
