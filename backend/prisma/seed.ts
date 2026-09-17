import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TrueCut Barbershop database seeding...');

  // 1. Seed System Settings
  const settings = [
    { key: 'booking_fee', value: '2', description: 'Standard non-refundable booking fee ($)', category: 'FEES' },
    { key: 'emergency_fee', value: '10', description: 'Priority emergency booking surcharge ($)', category: 'FEES' },
    { key: 'squeeze_in_fee', value: '3', description: 'Receptionist walk-in squeeze-in fee ($)', category: 'FEES' },
    { key: 'house_call_fee', value: '5', description: 'House call base travel fee ($)', category: 'FEES' },
    { key: 'penalty_fee', value: '3', description: 'Late cancellation or no-show penalty ($)', category: 'FEES' },
    { key: 'standard_buffer_minutes', value: '15', description: 'Preparation buffer after each service (minutes)', category: 'SCHEDULING' },
    { key: 'house_call_travel_buffer_minutes', value: '15', description: 'Additional travel buffer for house calls (minutes)', category: 'SCHEDULING' },
    { key: 'no_show_grace_minutes', value: '15', description: 'Grace period before appointment is marked NO_SHOW (minutes)', category: 'SCHEDULING' },
    { key: 'cancellation_cutoff_minutes', value: '120', description: 'Cutoff window for penalty-free cancellation (minutes)', category: 'POLICIES' },
    { key: 'booking_hold_minutes', value: '10', description: 'Temporary slot hold expiration timeout (minutes)', category: 'SCHEDULING' },
    { key: 'regular_customer_min_bookings', value: '5', description: 'Completed bookings required for Regular Customer priority', category: 'LOYALTY' },
    { key: 'regular_customer_period_days', value: '60', description: 'Evaluation period for Regular Customer calculation (days)', category: 'LOYALTY' },
    { key: 'house_call_max_distance_km', value: '10', description: 'Maximum house call radius from branch (km)', category: 'POLICIES' },
    { key: 'house_call_beyond_10km_policy', value: 'DECLINE', description: 'Policy for house calls beyond max distance (DECLINE | SCALED_FEE)', category: 'POLICIES' },
    { key: 'recurring_series_policy', value: 'EDIT_FUTURE_ONLY', description: 'Policy for recurring series editing', category: 'POLICIES' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description, category: setting.category },
      create: setting,
    });
  }
  console.log('✅ System Settings seeded');

  // 2. Seed Main Branch in Harare
  const harareBranch = await prisma.branch.upsert({
    where: { code: 'HARARE-MAIN' },
    update: {},
    create: {
      name: 'TrueCut Harare Main Branch',
      code: 'HARARE-MAIN',
      address: '100 Samora Machel Avenue, Harare Central',
      city: 'Harare',
      phone: '+263242700100',
      isActive: true,
      openTime: '08:00',
      closeTime: '18:00',
      timezone: 'Africa/Harare',
    },
  });
  console.log(`✅ Harare Main Branch seeded: ${harareBranch.id}`);

  // 3. Seed Services
  const servicesData = [
    { name: 'Classic Haircut', description: 'Precision hair trimming, styling, and scalp refresh', price: 15.00, durationMinutes: 30 },
    { name: 'Beard Trim & Styling', description: 'Detailed beard shaping, line-up, and beard oil conditioning', price: 10.00, durationMinutes: 20 },
    { name: 'Executive Cut & Hot Towel Shave', description: 'Full service haircut, hot towel massage, and traditional blade shave', price: 25.00, durationMinutes: 45 },
    { name: 'Hair Color & Treatment', description: 'Premium hair dye, gray coverage, and scalp care treatment', price: 30.00, durationMinutes: 60 },
    { name: 'Kids Haircut (Under 12)', description: 'Gentle and stylish haircut for young boys', price: 12.00, durationMinutes: 25 },
  ];

  const services = [];
  for (const sData of servicesData) {
    const existing = await prisma.service.findFirst({ where: { name: sData.name } });
    if (!existing) {
      const created = await prisma.service.create({ data: sData });
      services.push(created);
    } else {
      services.push(existing);
    }
  }
  console.log(`✅ ${services.length} Services seeded`);

  // Hash default password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 4. Seed Users for each Role
  // System Admin
  const sysAdmin = await prisma.user.upsert({
    where: { phone: '+263771000001' },
    update: {},
    create: {
      name: 'System Administrator',
      phone: '+263771000001',
      email: 'sysadmin@truecut.co.zw',
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
    },
  });

  // Company Admin
  const companyAdmin = await prisma.user.upsert({
    where: { phone: '+263771000002' },
    update: {},
    create: {
      name: 'Tendai Mutasa (Company Admin)',
      phone: '+263771000002',
      email: 'companyadmin@truecut.co.zw',
      passwordHash,
      role: UserRole.COMPANY_ADMIN,
    },
  });

  // Receptionist
  const receptionist = await prisma.user.upsert({
    where: { phone: '+263771000003' },
    update: {},
    create: {
      name: 'Chipo Moyo (Receptionist)',
      phone: '+263771000003',
      email: 'receptionist@truecut.co.zw',
      passwordHash,
      role: UserRole.RECEPTIONIST,
    },
  });

  await prisma.branchStaff.upsert({
    where: { userId_branchId: { userId: receptionist.id, branchId: harareBranch.id } },
    update: {},
    create: { userId: receptionist.id, branchId: harareBranch.id, isPrimary: true },
  });

  // Barbers
  const barbersData = [
    { name: 'Tinashe Barber', phone: '+263771000004', email: 'tinashe@truecut.co.zw' },
    { name: 'Farai Stylist', phone: '+263771000005', email: 'farai@truecut.co.zw' },
    { name: 'Blessing MasterBarber', phone: '+263771000006', email: 'blessing@truecut.co.zw' },
  ];

  for (const bData of barbersData) {
    const barber = await prisma.user.upsert({
      where: { phone: bData.phone },
      update: {},
      create: {
        name: bData.name,
        phone: bData.phone,
        email: bData.email,
        passwordHash,
        role: UserRole.BARBER,
      },
    });

    await prisma.branchStaff.upsert({
      where: { userId_branchId: { userId: barber.id, branchId: harareBranch.id } },
      update: {},
      create: { userId: barber.id, branchId: harareBranch.id, isPrimary: true },
    });

    // Map all services to barber
    for (const service of services) {
      await prisma.barberService.upsert({
        where: { barberId_serviceId: { barberId: barber.id, serviceId: service.id } },
        update: {},
        create: { barberId: barber.id, serviceId: service.id },
      });
    }

    // Map weekly schedule (Monday - Saturday 08:00 - 17:00, Sunday closed)
    for (let day = 0; day <= 6; day++) {
      const isWorking = day >= 1 && day <= 6; // Mon-Sat
      await prisma.barberSchedule.upsert({
        where: { barberId_branchId_dayOfWeek: { barberId: barber.id, branchId: harareBranch.id, dayOfWeek: day } },
        update: {},
        create: {
          barberId: barber.id,
          branchId: harareBranch.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          isWorkingDay: isWorking,
        },
      });
    }
  }

  // Client
  const client = await prisma.user.upsert({
    where: { phone: '+263771000007' },
    update: {},
    create: {
      name: 'Kudzai Ndlovu (Client)',
      phone: '+263771000007',
      email: 'client@truecut.co.zw',
      passwordHash,
      role: UserRole.CLIENT,
    },
  });

  console.log('✅ Users, Barbers, Schedules, and Default Client seeded successfully!');
  console.log('🎉 Database Seeding Completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
