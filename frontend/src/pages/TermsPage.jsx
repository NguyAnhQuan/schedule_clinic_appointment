import { useState } from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

function TermsPage() {
  const [activeSection, setActiveSection] = useState('intro');

  function scrollToSection(id, key) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(key);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PublicNavbar minimal />
      <main className="w-full max-w-5xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 md:sticky md:top-20 self-start">
          <h1 className="text-xl font-semibold text-text-main">Điều khoản sử dụng & Chính sách bảo mật</h1>
          <nav className="space-y-1 text-[11px] text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('terms-intro', 'intro')}
              className={`w-full text-left rounded-button px-3 py-2 font-medium ${
                activeSection === 'intro'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              1. Giới thiệu chung
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-data-processing', 'data')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'data'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              2. Thu thập & xử lý dữ liệu cá nhân
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-user-rights', 'user')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'user'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              3. Quyền & nghĩa vụ của người dùng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-clinic-rights', 'clinic')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'clinic'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              4. Quyền & nghĩa vụ của phòng khám
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-security', 'security')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'security'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              5. Bảo mật, an toàn thông tin & lưu trữ hồ sơ
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-sharing', 'sharing')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'sharing'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              6. Chia sẻ dữ liệu, bên thứ ba & chuyển giao
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-cookies', 'cookies')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'cookies'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              7. Quy định về cookie và công nghệ theo dõi
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('terms-law', 'law')}
              className={`w-full text-left rounded-button px-3 py-2 ${
                activeSection === 'law'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              8. Quy định pháp lý & giải quyết tranh chấp
            </button>
          </nav>
        </aside>

        <section className="rounded-2xl bg-white p-6 md:p-7 shadow-sm border border-slate-100 space-y-5 text-[11px] md:text-xs text-slate-700 leading-relaxed">
          <section id="terms-intro">
            <h2 className="text-sm font-semibold text-text-main mb-2">1. Giới thiệu chung</h2>
            <p className="mb-2">
              Hệ thống đặt lịch trực tuyến của Nha khoa Demo (&quot;Hệ thống&quot; hoặc
              &quot;Chúng tôi&quot;) được xây dựng nhằm hỗ trợ bệnh nhân đặt lịch khám, theo dõi
              lịch sử điều trị và giúp phòng khám vận hành hiệu quả. Việc bạn truy cập, sử dụng hệ
              thống này đồng nghĩa với việc bạn đã đọc, hiểu, đồng ý và chấp thuận bị ràng buộc bởi
              các điều khoản sử dụng và chính sách bảo mật được quy định trong văn bản này.
            </p>
            <p>
              Các điều khoản này được xây dựng phù hợp với quy định pháp luật Việt Nam hiện hành
              (bao gồm nhưng không giới hạn: Bộ luật Dân sự, Luật Khám bệnh, chữa bệnh, các quy
              định về bảo vệ dữ liệu cá nhân, an ninh mạng, v.v.) và có thể được cập nhật, chỉnh sửa
              theo từng thời điểm. Phiên bản cập nhật sẽ được công bố trên hệ thống và có hiệu lực
              kể từ thời điểm đăng tải.
            </p>
          </section>

          <section id="terms-data-processing">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              2. Thu thập &amp; xử lý dữ liệu cá nhân
            </h2>
            <p className="mb-2 font-medium">2.1. Loại thông tin thu thập</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-semibold">Thông tin định danh:</span> Họ tên, ngày sinh, giới
                tính, số điện thoại, email, địa chỉ liên hệ, số CMND/CCCD (nếu cần thiết cho việc
                xác minh danh tính khi điều trị).
              </li>
              <li>
                <span className="font-semibold">Thông tin tài khoản:</span> Tên đăng nhập, mật khẩu
                (được mã hoá), vai trò (bệnh nhân, bác sĩ, nhân viên, quản trị hệ thống).
              </li>
              <li>
                <span className="font-semibold">Thông tin y tế:</span> Lịch sử khám, chẩn đoán, kế
                hoạch điều trị, hình ảnh X-quang, toa thuốc, chỉ định thủ thuật, ghi chú của bác sĩ
                và các dữ liệu y tế khác liên quan đến quá trình khám chữa bệnh.
              </li>
              <li>
                <span className="font-semibold">Thông tin kỹ thuật:</span> Địa chỉ IP, loại thiết
                bị, trình duyệt, thời gian truy cập, các log hệ thống liên quan đến việc đăng nhập,
                thay đổi dữ liệu nhằm mục đích bảo mật và truy vết.
              </li>
            </ul>
            <p className="mt-3 mb-2 font-medium">2.2. Mục đích xử lý dữ liệu</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Thiết lập, quản lý và xác nhận lịch hẹn khám chữa bệnh của bạn tại phòng khám.</li>
              <li>
                Hỗ trợ bác sĩ nắm bắt đầy đủ lịch sử điều trị để đưa ra chẩn đoán và phác đồ điều
                trị phù hợp.
              </li>
              <li>
                Liên hệ với bạn về lịch hẹn, thay đổi lịch, nhắc tái khám hoặc các thông tin chăm
                sóc khách hàng liên quan trực tiếp đến dịch vụ đã sử dụng.
              </li>
              <li>
                Nâng cao chất lượng dịch vụ, tối ưu hoá trải nghiệm người dùng và bảo đảm an ninh,
                an toàn thông tin trên hệ thống.
              </li>
              <li>
                Thực hiện nghĩa vụ lưu trữ hồ sơ y tế theo quy định của pháp luật về khám bệnh,
                chữa bệnh và các quy định có liên quan.
              </li>
            </ul>
            <p className="mt-3">
              Việc thu thập và xử lý dữ liệu cá nhân được thực hiện trên cơ sở sự đồng ý của bạn và
             /hoặc căn cứ theo yêu cầu pháp lý bắt buộc. Bạn có quyền từ chối cung cấp một số thông
              tin; tuy nhiên điều này có thể ảnh hưởng đến khả năng cung cấp dịch vụ hoặc chất
              lượng chẩn đoán, điều trị.
            </p>
          </section>

          <section id="terms-user-rights">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              3. Quyền &amp; nghĩa vụ của người dùng
            </h2>
            <p className="mb-2 font-medium">3.1. Quyền của người dùng</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Yêu cầu được giải thích rõ ràng về cách thức hệ thống xử lý dữ liệu cá nhân của bạn.
              </li>
              <li>
                Yêu cầu truy cập, xem lại các thông tin cá nhân cơ bản và lịch sử lịch hẹn được lưu
                trên hệ thống.
              </li>
              <li>
                Yêu cầu chỉnh sửa thông tin liên hệ bị sai, thiếu hoặc không còn phù hợp nhằm đảm
                bảo liên lạc chính xác.
              </li>
              <li>
                Yêu cầu hạn chế xử lý một số dữ liệu trong trường hợp bạn có căn cứ cho rằng dữ liệu
                đó không chính xác hoặc việc xử lý là không cần thiết, trừ khi pháp luật yêu cầu
                lưu trữ bắt buộc (ví dụ hồ sơ y tế).
              </li>
              <li>
                Khiếu nại, phản ánh về việc lộ lọt, sử dụng sai mục đích dữ liệu cá nhân của mình tới
                phòng khám hoặc cơ quan nhà nước có thẩm quyền theo quy định pháp luật.
              </li>
            </ul>
            <p className="mt-3 mb-2 font-medium">3.2. Nghĩa vụ của người dùng</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Cung cấp thông tin trung thực, chính xác và cập nhật khi sử dụng hệ thống.</li>
              <li>
                Tự bảo mật thông tin đăng nhập (email, mật khẩu, mã xác thực) và không chia sẻ cho
                bên thứ ba không được uỷ quyền.
              </li>
              <li>
                Không lợi dụng hệ thống để truy cập trái phép, can thiệp, phá hoại dữ liệu hoặc xâm
                phạm quyền riêng tư của người dùng khác.
              </li>
              <li>
                Thông báo ngay cho phòng khám khi phát hiện tài khoản có dấu hiệu bị truy cập trái
                phép, bị lộ mật khẩu hoặc có hành vi bất thường.
              </li>
            </ul>
          </section>

          <section id="terms-clinic-rights">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              4. Quyền &amp; nghĩa vụ của phòng khám
            </h2>
            <p className="mb-2 font-medium">4.1. Quyền của phòng khám</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Từ chối cung cấp hoặc tạm ngừng dịch vụ đối với các tài khoản vi phạm điều khoản sử
                dụng, có dấu hiệu gian lận, lạm dụng hệ thống hoặc gây mất an toàn thông tin.
              </li>
              <li>
                Định kỳ nâng cấp, bảo trì hệ thống; có thể tạm ngừng cung cấp dịch vụ trong khoảng
                thời gian nhất định để phục vụ công tác này và sẽ thông báo trong khả năng cho phép.
              </li>
              <li>
                Sử dụng dữ liệu (đã được ẩn danh hoặc mã hoá) để thống kê, phân tích nội bộ, nâng
                cao chất lượng dịch vụ.
              </li>
            </ul>
            <p className="mt-3 mb-2 font-medium">4.2. Nghĩa vụ của phòng khám</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Tuân thủ nghiêm túc các quy định của pháp luật về bảo vệ dữ liệu cá nhân, bảo mật
                thông tin và lưu trữ hồ sơ y tế.
              </li>
              <li>
                Áp dụng các biện pháp kỹ thuật, tổ chức hợp lý nhằm ngăn ngừa việc truy cập trái
                phép, mất mát, phá huỷ hoặc sử dụng sai mục đích dữ liệu cá nhân.
              </li>
              <li>
                Chỉ cho phép nhân sự có thẩm quyền (bác sĩ, nhân viên y tế, nhân viên chăm sóc
                khách hàng) truy cập vào thông tin cần thiết để thực hiện nhiệm vụ chuyên môn.
              </li>
              <li>
                Thông báo cho người dùng trong thời gian hợp lý nếu phát hiện sự cố vi phạm bảo mật
                có nguy cơ ảnh hưởng nghiêm trọng đến quyền và lợi ích hợp pháp của họ, trừ trường
                hợp pháp luật có quy định khác.
              </li>
            </ul>
          </section>

          <section id="terms-security">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              5. Bảo mật, an toàn thông tin &amp; lưu trữ hồ sơ
            </h2>
            <p className="mb-2">
              Mật khẩu người dùng được mã hoá trước khi lưu trữ. Hệ thống áp dụng các cơ chế phân
              quyền, ghi log truy cập và sử dụng kết nối bảo mật (ví dụ HTTPS) để hạn chế rủi ro
              nghe lén, giả mạo. Dữ liệu y tế được lưu trữ trên máy chủ hoặc dịch vụ hạ tầng đáp ứng
              yêu cầu về an toàn thông tin theo chuẩn nội bộ của phòng khám.
            </p>
            <p className="mb-2">
              Thời gian lưu trữ hồ sơ y tế tuân theo quy định của pháp luật về khám bệnh, chữa
              bệnh. Sau thời hạn này, dữ liệu có thể được ẩn danh hoặc xoá, trừ trường hợp pháp
              luật yêu cầu lưu trữ lâu hơn hoặc phục vụ mục đích tố tụng, giải quyết khiếu nại, tranh
              chấp.
            </p>
            <p>
              Mặc dù chúng tôi nỗ lực áp dụng các biện pháp bảo mật hợp lý, không có hệ thống nào
              có thể đảm bảo an toàn tuyệt đối 100%. Bạn vui lòng hiểu rằng rủi ro khách quan (tấn
              công mạng, sự cố hạ tầng của bên thứ ba, v.v.) vẫn có thể xảy ra, nhưng chúng tôi sẽ
              chủ động phối hợp với các bên liên quan để khắc phục và giảm thiểu thiệt hại.
            </p>
          </section>

          <section id="terms-sharing">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              6. Chia sẻ dữ liệu, bên thứ ba &amp; chuyển giao
            </h2>
            <p className="mb-2">
              Chúng tôi không bán, cho thuê dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục
              đích thương mại. Dữ liệu có thể được chia sẻ trong các trường hợp sau:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Theo yêu cầu của cơ quan nhà nước có thẩm quyền theo đúng trình tự, thủ tục pháp
                luật quy định.
              </li>
              <li>
                Với các đơn vị cung cấp dịch vụ hạ tầng, công nghệ thông tin, lưu trữ dữ liệu, bảo
                trì hệ thống – trên cơ sở hợp đồng có điều khoản bảo mật chặt chẽ.
              </li>
              <li>
                Khi có sự đồng ý rõ ràng, riêng biệt của bạn cho những chương trình, tiện ích hoặc
                dịch vụ cụ thể.
              </li>
            </ul>
            <p className="mt-3">
              Trong trường hợp có thay đổi về chủ thể quản lý (ví dụ: sáp nhập, mua bán, chuyển
              nhượng phòng khám), dữ liệu người dùng có thể được chuyển giao cho đơn vị kế thừa,
              nhưng vẫn phải tuân thủ các nghĩa vụ bảo mật và bảo vệ dữ liệu cá nhân theo quy định
              pháp luật.
            </p>
          </section>

          <section id="terms-cookies">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              7. Cookie và công nghệ theo dõi
            </h2>
            <p className="mb-2">
              Hệ thống có thể sử dụng cookie hoặc các công nghệ tương tự để ghi nhớ phiên đăng nhập,
              lưu trữ một số tuỳ chọn giao diện, đo lường lưu lượng truy cập và cải thiện trải
              nghiệm người dùng. Bạn có thể cấu hình trình duyệt để từ chối hoặc xoá cookie; tuy
              nhiên một số tính năng có thể hoạt động không ổn định khi cookie bị vô hiệu hoá.
            </p>
          </section>

          <section id="terms-law">
            <h2 className="text-sm font-semibold text-text-main mb-2">
              8. Quy định pháp lý, sửa đổi &amp; giải quyết tranh chấp
            </h2>
            <p className="mb-2">
              Các điều khoản sử dụng và chính sách bảo mật này được điều chỉnh và giải thích theo
              pháp luật Việt Nam. Mọi tranh chấp phát sinh liên quan đến việc sử dụng hệ thống, nếu
              không giải quyết được bằng thương lượng, hoà giải, sẽ được đưa ra cơ quan có thẩm
              quyền tại Việt Nam để giải quyết.
            </p>
            <p>
              Chúng tôi có thể cập nhật, sửa đổi nội dung điều khoản theo từng thời điểm để phù hợp
              với thay đổi pháp luật hoặc nhu cầu vận hành. Phiên bản cập nhật sẽ được công bố trên
              hệ thống, và việc bạn tiếp tục sử dụng dịch vụ sau thời điểm đó được xem là bạn đã
              chấp nhận nội dung sửa đổi.
            </p>
          </section>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default TermsPage;

