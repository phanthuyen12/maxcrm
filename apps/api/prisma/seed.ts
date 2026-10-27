import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickMany<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const TEN_NAM = ['Văn', 'Hữu', 'Quốc', 'Minh', 'Đức', 'Thành', 'Công', 'Tuấn', 'Anh', 'Hoàng'];
const TEN_NU = ['Thị', 'Ngọc', 'Thanh', 'Kim', 'Thu', 'Hồng', 'Mỹ', 'Diệu', 'Lan', 'Bích'];
const TEN_CUOI_NAM = ['Nam', 'Dũng', 'Cường', 'Khang', 'Phúc', 'Long', 'Sơn', 'Đạt', 'Hiếu', 'Bảo', 'Huy', 'Kiên', 'Phong', 'Thắng', 'Vinh'];
const TEN_CUOI_NU = ['Hoa', 'Mai', 'Linh', 'Hương', 'Trang', 'Nhi', 'Vy', 'Phương', 'Thảo', 'Hạnh', 'Nga', 'Yến', 'Quyên', 'Trúc', 'Anh'];

function randomVietnameseName(): { name: string; gender: 'M' | 'F' } {
  const gender: 'M' | 'F' = Math.random() > 0.5 ? 'M' : 'F';
  const ho = pick(HO);
  if (gender === 'M') {
    return { name: `${ho} ${pick(TEN_NAM)} ${pick(TEN_CUOI_NAM)}`, gender };
  }
  return { name: `${ho} ${pick(TEN_NU)} ${pick(TEN_CUOI_NU)}`, gender };
}

function randomPhone(usedPhones: Set<string>): string {
  let phone: string;
  do {
    const prefix = pick(['090', '091', '093', '094', '096', '097', '098', '032', '033', '034', '035', '037', '038', '039']);
    phone = prefix + String(randInt(1000000, 9999999));
  } while (usedPhones.has(phone));
  usedPhones.add(phone);
  return phone;
}

const SOURCES = ['Zalo OA', 'Facebook', 'Giới thiệu', 'Website', 'Hotline'];

const INBOUND_LINES = [
  'Chào shop, mình muốn hỏi về sản phẩm bên mình',
  'Sản phẩm này giá bao nhiêu vậy ạ?',
  'Có mẫu nào khác màu không shop?',
  'Mình ở Quận 7, ship về có nhanh không?',
  'Cho mình xin bảng giá chi tiết nha',
  'Đặt hàng rồi mà chưa thấy liên hệ xác nhận',
  'Bên mình có khuyến mãi gì không shop ơi?',
  'Mình cần tư vấn thêm trước khi đặt',
  'Sản phẩm này dùng được cho ai vậy?',
  'Cảm ơn shop, mình sẽ đặt hàng luôn',
  'Có thể đổi trả trong bao lâu?',
  'Mình thanh toán chuyển khoản được không?',
];

const OUTBOUND_LINES = [
  'Chào anh/chị, Shop xin chào ạ! Anh/chị cần hỗ trợ gì không?',
  'Sản phẩm này hiện có giá 450.000đ anh/chị nhé, đang có ưu đãi -10% ạ.',
  'Dạ shop còn hàng, anh/chị cho xin thông tin SĐT và địa chỉ để shop lên đơn nhé.',
  'Ship toàn quốc ạ, khu vực nội thành thường giao trong 1-2 ngày anh/chị.',
  'Shop đã ghi nhận đơn, sẽ liên hệ lại trong vòng 30 phút nhé ạ.',
  'Dạ sản phẩm có chính sách đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất ạ.',
  'Anh/chị có thể chuyển khoản hoặc thanh toán khi nhận hàng (COD) đều được ạ.',
  'Cảm ơn anh/chị đã tin tưởng ủng hộ shop nha!',
  'Shop gửi anh/chị bảng giá chi tiết, anh/chị xem qua giúp shop nhé.',
  'Anh/chị đợi shop xíu, để shop kiểm tra lại tồn kho ạ.',
];

const TEMPLATES = [
  { title: 'Chào hỏi khách mới', category: 'Chào hỏi', content: 'Chào anh/chị, em là nhân viên tư vấn của shop. Em có thể hỗ trợ gì cho anh/chị hôm nay ạ?' },
  { title: 'Báo giá sản phẩm', category: 'Báo giá', content: 'Dạ sản phẩm anh/chị quan tâm hiện có giá {{gia}}đ, đang áp dụng ưu đãi cho khách mới ạ.' },
  { title: 'Xác nhận đơn hàng', category: 'Đơn hàng', content: 'Shop xin xác nhận đơn hàng của anh/chị gồm {{san_pham}}, tổng tiền {{tong_tien}}đ. Shop sẽ giao trong 1-3 ngày ạ.' },
  { title: 'Xác nhận lịch hẹn', category: 'Lịch hẹn', content: 'Shop xác nhận lịch hẹn với anh/chị vào {{thoi_gian}}. Rất mong được gặp anh/chị ạ!' },
  { title: 'Cảm ơn sau mua hàng', category: 'Chăm sóc', content: 'Cảm ơn anh/chị đã tin tưởng ủng hộ shop. Nếu cần hỗ trợ thêm, anh/chị cứ nhắn cho shop nha!' },
  { title: 'Xin lỗi phản hồi chậm', category: 'Chăm sóc', content: 'Shop xin lỗi vì đã phản hồi chậm. Em sẽ hỗ trợ anh/chị ngay bây giờ ạ.' },
  { title: 'Nhắc lịch thanh toán', category: 'Đơn hàng', content: 'Shop nhắc anh/chị đơn hàng {{ma_don}} cần hoàn tất thanh toán trước {{han}} ạ.' },
];

async function main() {
  console.log('Xoá dữ liệu cũ...');
  await prisma.activityLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.customerTag.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.task.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.oAStaffAccess.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.zaloOA.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customerSource.deleteMany();
  await prisma.templateCategory.deleteMany();

  console.log('Tạo danh mục (nguồn khách hàng, danh mục mẫu tin nhắn)...');
  for (const name of SOURCES) {
    await prisma.customerSource.upsert({ where: { name }, update: {}, create: { name } });
  }
  const templateCategoryNames = Array.from(new Set(TEMPLATES.map((t) => t.category))).concat('Chung');
  for (const name of templateCategoryNames) {
    await prisma.templateCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log('Tạo nhân viên...');
  const passwordHash = await bcrypt.hash('123456', 10);
  const staffData = [
    { name: 'Nguyễn Minh Anh', role: 'ADMIN' as const, isAcceptingChats: true },
    { name: 'Trần Thị Thu Hương', role: 'MANAGER' as const, isAcceptingChats: true },
    { name: 'Lê Quốc Dũng', role: 'MANAGER' as const, isAcceptingChats: true },
    { name: 'Phạm Thanh Trúc', role: 'AGENT' as const, isAcceptingChats: true },
    { name: 'Hoàng Văn Phong', role: 'AGENT' as const, isAcceptingChats: true },
    { name: 'Huỳnh Ngọc Mai', role: 'AGENT' as const, isAcceptingChats: false },
    { name: 'Vũ Đức Kiên', role: 'AGENT' as const, isAcceptingChats: true },
    { name: 'Đặng Thị Bích Vy', role: 'AGENT' as const, isAcceptingChats: false },
  ];
  const users: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  for (let i = 0; i < staffData.length; i++) {
    const s = staffData[i];
    const email = `nhanvien${i + 1}@zalocrm.vn`;
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email,
        passwordHash,
        role: s.role,
        isAcceptingChats: s.isAcceptingChats,
        maxConcurrentChats: s.role === 'AGENT' ? 15 : 30,
      },
    });
    users.push(user);
  }
  const admin = users[0];
  const agents = users.filter((u) => u.role === 'AGENT');

  console.log('Tạo Zalo OA...');
  const oaData = [
    { name: 'Cửa hàng Thời trang ABC', zaloOaId: 'oa_abc_fashion', status: 'CONNECTED' as const },
    { name: 'Phòng khám Nha khoa Sunshine', zaloOaId: 'oa_sunshine_dental', status: 'CONNECTED' as const },
    { name: 'Trung tâm Anh ngữ Global', zaloOaId: 'oa_global_english', status: 'EXPIRED' as const },
  ];
  const oas: Awaited<ReturnType<typeof prisma.zaloOA.create>>[] = [];
  for (const o of oaData) {
    const oa = await prisma.zaloOA.create({
      data: {
        name: o.name,
        zaloOaId: o.zaloOaId,
        status: o.status,
        lastSyncAt: o.status === 'CONNECTED' ? daysAgo(randInt(0, 2)) : daysAgo(randInt(10, 20)),
        dailyMessageLimit: pick([300, 500, 1000]),
        messagesSentToday: randInt(10, 150),
        webhookSecret: randomUUID(),
        webhookVerifiedAt: o.status === 'CONNECTED' ? daysAgo(randInt(0, 2)) : null,
      },
    });
    oas.push(oa);
  }

  console.log('Phân quyền nhân viên cho OA...');
  for (const user of users) {
    for (const oa of pickMany(oas, randInt(1, oas.length))) {
      await prisma.oAStaffAccess.create({
        data: { userId: user.id, zaloOAId: oa.id, canSend: user.role !== 'AGENT' || Math.random() > 0.2 },
      });
    }
  }

  console.log('Tạo nhãn...');
  const tagData = [
    { name: 'VIP', color: '#F59E0B' },
    { name: 'Khách mới', color: '#0068FF' },
    { name: 'Quan tâm giá', color: '#8B5CF6' },
    { name: 'Đã mua', color: '#16A34A' },
    { name: 'Cần chăm sóc lại', color: '#EF4444' },
  ];
  const tags: Awaited<ReturnType<typeof prisma.tag.create>>[] = [];
  for (const t of tagData) {
    tags.push(await prisma.tag.create({ data: t }));
  }

  console.log('Tạo khách hàng...');
  const usedPhones = new Set<string>();
  const customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = [];
  const customerStatuses = ['NEW', 'ACTIVE', 'INACTIVE'] as const;
  for (let i = 0; i < 60; i++) {
    const { name } = randomVietnameseName();
    const hasAssignee = Math.random() > 0.15;
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: randomPhone(usedPhones),
        source: pick(SOURCES),
        status: pick(customerStatuses),
        assignedToId: hasAssignee ? pick(agents).id : null,
        createdAt: daysAgo(randInt(0, 60)),
      },
    });
    customers.push(customer);
  }

  console.log('Gắn nhãn cho khách hàng...');
  for (const customer of customers) {
    if (Math.random() > 0.4) {
      const customerTags = pickMany(tags, randInt(1, 2));
      for (const tag of customerTags) {
        await prisma.customerTag.create({ data: { customerId: customer.id, tagId: tag.id } });
      }
    }
  }

  console.log('Tạo ghi chú & lịch hẹn...');
  for (const customer of pickMany(customers, 25)) {
    await prisma.note.create({
      data: {
        customerId: customer.id,
        authorId: pick(agents).id,
        content: pick([
          'Khách quan tâm sản phẩm cao cấp, cần tư vấn kỹ về giá.',
          'Khách đã từng mua hàng, phản hồi tốt về chất lượng.',
          'Khách yêu cầu gọi lại vào buổi tối sau 19h.',
          'Khách còn đang so sánh giá với đối thủ.',
          'Đã gửi báo giá, đang chờ khách phản hồi.',
        ]),
        createdAt: daysAgo(randInt(0, 20)),
      },
    });
  }
  for (const customer of pickMany(customers, 18)) {
    const future = Math.random() > 0.4;
    await prisma.appointment.create({
      data: {
        customerId: customer.id,
        staffId: pick(agents).id,
        title: pick(['Tư vấn trực tiếp', 'Gọi điện xác nhận đơn', 'Hẹn giao hàng', 'Tư vấn demo sản phẩm']),
        startAt: future ? daysFromNow(randInt(1, 10)) : daysAgo(randInt(1, 15)),
        status: future ? 'SCHEDULED' : pick(['DONE', 'CANCELED']),
      },
    });
  }

  console.log('Tạo hội thoại & tin nhắn...');
  const convStatuses = ['UNREAD', 'PROCESSING', 'RESOLVED'] as const;
  for (const customer of pickMany(customers, 48)) {
    const oa = pick(oas);
    const hasAssignee = Math.random() > 0.25;
    const status = pick(convStatuses);
    const conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        zaloOAId: oa.id,
        assignedToId: hasAssignee ? (customer.assignedToId ?? pick(agents).id) : null,
        status,
        lastMessageAt: daysAgo(randInt(0, 10)),
      },
    });

    const messageCount = randInt(3, 15);
    let currentTime = daysAgo(randInt(1, 10));
    let lastMessage: Awaited<ReturnType<typeof prisma.message.create>> | null = null;
    for (let i = 0; i < messageCount; i++) {
      const direction = i % 2 === 0 ? 'IN' : 'OUT';
      currentTime = new Date(currentTime.getTime() + randInt(2, 40) * 60000);
      lastMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction,
          type: 'TEXT',
          content: direction === 'IN' ? pick(INBOUND_LINES) : pick(OUTBOUND_LINES),
          senderId: direction === 'OUT' ? pick(agents).id : null,
          status: 'SENT',
          sentAt: currentTime,
        },
      });
    }
    if (lastMessage) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: lastMessage.sentAt },
      });
    }
  }

  console.log('Tạo deal pipeline...');
  const stages = ['NEW', 'CONSULTING', 'POTENTIAL', 'WON', 'LOST'] as const;
  for (const customer of pickMany(customers, 32)) {
    await prisma.deal.create({
      data: {
        customerId: customer.id,
        ownerId: pick(agents).id,
        stage: pick(stages),
        value: randInt(2, 400) * 100000,
        note: Math.random() > 0.5 ? 'Khách đang cân nhắc giữa các gói dịch vụ.' : null,
        createdAt: daysAgo(randInt(0, 45)),
      },
    });
  }

  console.log('Tạo công việc...');
  const taskTitles = [
    'Gọi điện xác nhận đơn hàng',
    'Gửi báo giá chi tiết',
    'Chăm sóc khách sau bán',
    'Nhắc khách thanh toán',
    'Tư vấn lại khách còn phân vân',
    'Xác nhận lịch giao hàng',
    'Follow-up sau demo sản phẩm',
  ];
  for (let i = 0; i < 25; i++) {
    const overdue = i < 8;
    await prisma.task.create({
      data: {
        title: pick(taskTitles),
        description: 'Liên hệ và cập nhật trạng thái vào hệ thống sau khi hoàn tất.',
        customerId: Math.random() > 0.2 ? pick(customers).id : null,
        assigneeId: pick(agents).id,
        dueAt: overdue ? daysAgo(randInt(1, 5)) : daysFromNow(randInt(1, 10)),
        status: overdue ? 'TODO' : pick(['TODO', 'DONE']),
        priority: pick(['LOW', 'MEDIUM', 'HIGH']),
      },
    });
  }

  console.log('Tạo mẫu tin nhắn...');
  for (const t of TEMPLATES) {
    await prisma.messageTemplate.create({ data: { ...t, createdById: admin.id } });
  }

  console.log('Tạo lịch sử hoạt động...');
  for (const customer of pickMany(customers, 20)) {
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        actorId: pick(agents).id,
        type: pick(['note_added', 'tag_added', 'stage_changed', 'appointment_created']),
        content: 'Hoạt động chăm sóc khách hàng được ghi nhận tự động từ dữ liệu mẫu.',
        createdAt: daysAgo(randInt(0, 30)),
      },
    });
  }

  console.log('Seed hoàn tất.');
  console.log(`Đăng nhập thử: ${users[0].email} / 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
