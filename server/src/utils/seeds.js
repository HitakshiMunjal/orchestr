const { signTicket, generateCertificateHash } = require('./crypto');

async function seedDatabase(db) {
  const usersCount = await db.users.countDocuments();
  if (usersCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding initial campus data for Orchestr...');

  // 1. Users
  const users = [
    {
      id: 'usr_student_aarav',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@iitd.ac.in',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      studentId: '2023CSB1042',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      strikes: 1,
      strikeHistory: [
        {
          id: 'strk_01',
          eventId: 'evt_past_opensource',
          eventTitle: 'Open Source Campus Summit',
          reason: 'Registered but did not attend (Automated No-show detection)',
          issuedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          issuedBy: 'Automated No-Show System'
        }
      ],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_student_chloe',
      name: 'Chloe Bennett',
      email: 'cbennett@stanford.edu',
      role: 'STUDENT',
      department: 'Symbolic Systems',
      studentId: 'STAN-8891',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      strikes: 0,
      strikeHistory: [],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_student_rohan',
      name: 'Rohan Mehta',
      email: 'rohan.mehta@iitb.ac.in',
      role: 'STUDENT',
      department: 'Electrical Engineering',
      studentId: '2024EE2091',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      strikes: 2,
      strikeHistory: [
        {
          id: 'strk_02',
          eventId: 'evt_past_design',
          eventTitle: 'UI/UX Design Sprint',
          reason: 'No-show penalty applied',
          issuedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          issuedBy: 'Automated No-Show System'
        },
        {
          id: 'strk_03',
          eventId: 'evt_past_web3',
          eventTitle: 'Web3 & Smart Contracts Workshop',
          reason: 'No-show penalty applied',
          issuedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          issuedBy: 'Automated No-Show System'
        }
      ],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_student_zack',
      name: 'Zack Snyder',
      email: 'zsnyder@mit.edu',
      role: 'STUDENT',
      department: 'Media Arts & Sciences',
      studentId: 'MIT-40192',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      strikes: 3,
      strikeHistory: [
        { id: 'strk_04', eventId: 'evt_1', eventTitle: 'RoboWars', reason: 'No-show', issuedAt: new Date(Date.now() - 20 * 86400000).toISOString(), issuedBy: 'Automated No-Show System' },
        { id: 'strk_05', eventId: 'evt_2', eventTitle: 'Drone Race', reason: 'No-show', issuedAt: new Date(Date.now() - 10 * 86400000).toISOString(), issuedBy: 'Automated No-Show System' },
        { id: 'strk_06', eventId: 'evt_3', eventTitle: 'AI Night', reason: 'No-show', issuedAt: new Date(Date.now() - 2 * 86400000).toISOString(), issuedBy: 'Automated No-Show System' }
      ],
      isBlockedUntil: new Date(Date.now() + 12 * 86400000).toISOString(), // Blocked for 12 more days!
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_organizer_priya',
      name: 'Priya Patel',
      email: 'priya.patel@stanford.edu',
      role: 'ORGANIZER',
      department: 'Tech & Innovation Club (Lead)',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      strikes: 0,
      strikeHistory: [],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_manager_vikram',
      name: 'Dr. Vikram Rao',
      email: 'vikram.rao@iitb.ac.in',
      role: 'RESOURCE_MANAGER',
      department: 'Central Research Labs & Media Center',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      strikes: 0,
      strikeHistory: [],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_admin_malhotra',
      name: 'Dean K. Malhotra',
      email: 'malhotra.dean@harvard.edu',
      role: 'SUPER_ADMIN',
      department: 'Office of Campus Affairs & Registrar',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      strikes: 0,
      strikeHistory: [],
      isBlockedUntil: null,
      createdAt: new Date().toISOString()
    }
  ];
  await db.users.insertMany(users);

  // 2. Resources (Rooms & Gear)
  const resources = [
    {
      id: 'res_turing_hall',
      name: 'Alan Turing Seminar Hall',
      type: 'ROOM',
      category: 'SEMINAR_HALL',
      tier: 'BASIC', // Auto-approves
      capacity: 60,
      location: 'Turing Block, 2nd Floor (West Wing)',
      description: 'Tiered acoustic seating with 4K laser projection, dual podium mics, and digital climate control.',
      specs: ['60 Fixed Ergonomic Seats', '4K Laser Projection', 'Dual Shure Gooseneck Podiums', 'HDMI/AirPlay Matrix'],
      requiresApproval: false,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500'
    },
    {
      id: 'res_alan_kay_auditorium',
      name: 'Alan Kay Grand Auditorium',
      type: 'ROOM',
      category: 'AUDITORIUM',
      tier: 'RESTRICTED', // Requires Manager/Admin approval
      capacity: 250,
      location: 'Central Performing Arts & Science Complex',
      description: 'Flagship university auditorium for keynotes, hackathon ceremonies, and national technical symposiums.',
      specs: ['250 Plush Theatre Seats', 'Linear Array Line PA System', '300-inch Motorized Screen', 'Stage DMX Lighting'],
      requiresApproval: true,
      approverRole: 'SUPER_ADMIN',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500'
    },
    {
      id: 'res_ada_ai_lab',
      name: 'Ada Lovelace AI & GPU Compute Lab',
      type: 'ROOM',
      category: 'LAB',
      tier: 'RESTRICTED', // Requires Lab Manager approval
      capacity: 35,
      location: 'Computer Center, Room CC-304',
      description: 'Air-conditioned compute cluster lab with 35 workstations connected to local NVIDIA DGX H100 GPU nodes.',
      specs: ['35 High-Spec Linux Workstations', 'NVIDIA GPU Cluster Access', 'Gigabit Fibre Ethernet', 'Biometric Door Lock'],
      requiresApproval: true,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'
    },
    {
      id: 'res_robotics_lab',
      name: 'Robotics & Autonomous Systems Lab',
      type: 'ROOM',
      category: 'LAB',
      tier: 'RESTRICTED',
      capacity: 30,
      location: 'Mechanical Sciences Annex Ground Floor',
      description: 'Equipped with indoor drone flight cages, soldering bays, 3D printers, and optical motion capture tracking.',
      specs: ['Safety Netting Enclosure', '10 Weller Solder Stations', '4 BambuLab X1C 3D Printers', 'OptiTrack MoCap Cameras'],
      requiresApproval: true,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500'
    },
    {
      id: 'res_smart_class_204',
      name: 'Smart Interactive Classroom 204',
      type: 'ROOM',
      category: 'SEMINAR_HALL',
      tier: 'BASIC', // Auto-approves
      capacity: 45,
      location: 'Humanities & Sciences Quad, Room 204',
      description: 'Collaborative seating pods with movable whiteboard partitions and 75-inch ViewSonic interactive touch displays.',
      specs: ['45 Movable Desks', '75-inch Touchscreen Display', 'Surround Classroom Mic', 'Wireless Presentation Gateway'],
      requiresApproval: false,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500'
    },
    {
      id: 'res_sony_cine_rig',
      name: 'Sony FX3 4K Cinema Camera Rig',
      type: 'EQUIPMENT',
      category: 'CAMERA',
      tier: 'RESTRICTED', // Restricted gear
      location: 'Media Cage Locker #4',
      description: 'Full-frame cinema line camera with Tilta cage, Sony 24-70mm GM II lens, Atomos Ninja V monitor, and V-mount battery.',
      specs: ['Sony FX3 Full-Frame 4K120p', 'Sony 24-70 f/2.8 GM II Lens', 'Atomos Ninja V 5-inch HDR Monitor', '2x 98Wh V-Mount Batteries'],
      requiresApproval: true,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500'
    },
    {
      id: 'res_sennheiser_mic',
      name: 'Sennheiser EW-DX Wireless Dual Mic Kit',
      type: 'EQUIPMENT',
      category: 'AUDIO',
      tier: 'BASIC',
      location: 'AV Storage Locker #2',
      description: 'Digital dual-channel UHF wireless microphone kit with 2 bodypacks, 2 lavalier mics, and receiver.',
      specs: ['Dual Channel Digital UHF', 'Omnidirectional ME 2 Lavaliers', '100m Range Line-of-sight', 'OLED Battery Indicators'],
      requiresApproval: false,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500'
    },
    {
      id: 'res_epson_projector',
      name: 'Epson Pro L1070U 7000-Lumen Laser Projector',
      type: 'EQUIPMENT',
      category: 'PROJECTOR',
      tier: 'BASIC',
      location: 'IT Equipment Vault Shelf A',
      description: 'Ultra-bright venue projector for outdoor evening hackathon demos, courtyards, and exhibition halls.',
      specs: ['7000 Lumens WUXGA 4K Enhancement', 'Laser Light Source (20,000 hrs)', 'Interchangeable Middle-Throw Lens'],
      requiresApproval: false,
      approverRole: 'RESOURCE_MANAGER',
      cleanupBufferMinutes: 30,
      currentCondition: 'Good',
      imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500'
    }
  ];
  await db.resources.insertMany(resources);

  // 3. Bookings
  const now = Date.now();
  const bookings = [
    {
      id: 'bkg_turing_approved',
      resourceId: 'res_turing_hall',
      resourceName: 'Alan Turing Seminar Hall',
      resourceType: 'ROOM',
      bookedByUserId: 'usr_organizer_priya',
      bookedByUserName: 'Priya Patel',
      bookedByUserEmail: 'priya.patel@stanford.edu',
      purpose: 'Deep Learning & Generative AI Workshop (Part 2)',
      startTime: new Date(now + 2 * 3600000).toISOString(), // 2 hours from now
      endTime: new Date(now + 5 * 3600000).toISOString(),
      status: 'APPROVED',
      approvalReason: 'Auto-approved (Standard basic seminar venue policy)',
      approvedBy: 'System Auto-Approval Engine',
      approvedAt: new Date(now - 86400000).toISOString(),
      autoReleaseDeadline: new Date(now + 2 * 3600000 + 20 * 60000).toISOString(), // startTime + 20 mins
      createdAt: new Date(now - 86400000).toISOString()
    },
    {
      id: 'bkg_ai_lab_pending',
      resourceId: 'res_ada_ai_lab',
      resourceName: 'Ada Lovelace AI & GPU Compute Lab',
      resourceType: 'ROOM',
      bookedByUserId: 'usr_organizer_priya',
      bookedByUserName: 'Priya Patel',
      bookedByUserEmail: 'priya.patel@stanford.edu',
      purpose: 'High-Performance PyTorch Distributed Training Session',
      startTime: new Date(now + 26 * 3600000).toISOString(), // tomorrow
      endTime: new Date(now + 30 * 3600000).toISOString(),
      status: 'PENDING',
      approvalReason: 'Pending review by Lab Manager (Restricted H100 cluster resource)',
      autoReleaseDeadline: new Date(now + 26 * 3600000 + 20 * 60000).toISOString(),
      createdAt: new Date(now - 12000000).toISOString()
    },
    {
      id: 'bkg_unclaimed_test',
      resourceId: 'res_smart_class_204',
      resourceName: 'Smart Interactive Classroom 204',
      resourceType: 'ROOM',
      bookedByUserId: 'usr_student_rohan',
      bookedByUserName: 'Rohan Mehta',
      bookedByUserEmail: 'rohan.mehta@iitb.ac.in',
      purpose: 'Robotics Team Strategy Meeting',
      // Started 25 minutes ago! Demonstrates Unclaimed Slot Auto-Release!
      startTime: new Date(now - 25 * 60000).toISOString(),
      endTime: new Date(now + 95 * 60000).toISOString(),
      status: 'APPROVED',
      checkedInAt: null,
      autoReleaseDeadline: new Date(now - 5 * 60000).toISOString(), // expired 5 mins ago!
      createdAt: new Date(now - 2 * 86400000).toISOString()
    }
  ];
  await db.bookings.insertMany(bookings);

  // 4. Events
  const events = [
    {
      id: 'evt_part1_completed',
      title: 'Intro to Neural Networks & Computer Vision (Part 1)',
      description: 'Foundational workshop covering perceptrons, backpropagation, CNN architectures, and image classification basics.',
      organizerId: 'usr_organizer_priya',
      organizerName: 'Priya Patel',
      organizerEmail: 'priya.patel@stanford.edu',
      clubName: 'AI & Robotics Society',
      resourceId: 'res_turing_hall',
      resourceName: 'Alan Turing Seminar Hall',
      venueCapacity: 60,
      startTime: new Date(now - 10 * 86400000).toISOString(), // 10 days ago
      endTime: new Date(now - 10 * 86400000 + 3 * 3600000).toISOString(),
      category: 'WORKSHOP',
      status: 'COMPLETED',
      prerequisites: [],
      dualScanRequired: false,
      registeredCount: 55,
      checkedInCount: 52,
      waitlistCount: 0,
      coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
      tags: ['AI', 'Computer Vision', 'Deep Learning', 'PyTorch'],
      createdAt: new Date(now - 20 * 86400000).toISOString()
    },
    {
      id: 'evt_part2_upcoming',
      title: 'Deep Learning & Generative AI Workshop (Part 2)',
      description: 'Hands-on session on Diffusion Models, Transformer attention heads, and fine-tuning LLMs with LoRA. Requires completion of Part 1!',
      organizerId: 'usr_organizer_priya',
      organizerName: 'Priya Patel',
      organizerEmail: 'priya.patel@stanford.edu',
      clubName: 'AI & Robotics Society',
      resourceId: 'res_turing_hall',
      resourceName: 'Alan Turing Seminar Hall',
      venueCapacity: 60,
      startTime: new Date(now + 2 * 3600000).toISOString(), // 2 hours from now
      endTime: new Date(now + 5 * 3600000).toISOString(),
      category: 'WORKSHOP',
      status: 'PUBLISHED',
      prerequisites: [
        {
          eventId: 'evt_part1_completed',
          eventTitle: 'Intro to Neural Networks & Computer Vision (Part 1)'
        }
      ],
      dualScanRequired: true, // Requires both Entry and Exit scans to prevent early leave!
      registeredCount: 58,
      checkedInCount: 0,
      waitlistCount: 3,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
      tags: ['Deep Learning', 'Generative AI', 'Transformers', 'Dual-Scan'],
      createdAt: new Date(now - 5 * 86400000).toISOString()
    },
    {
      id: 'evt_hackathon_main',
      title: 'HackTheCampus 2026: 36-Hour National Hackathon',
      description: 'The premier inter-college hackathon bringing together 250 top student developers, engineers, and designers with $15,000 in bounties.',
      organizerId: 'usr_organizer_priya',
      organizerName: 'Priya Patel',
      organizerEmail: 'priya.patel@stanford.edu',
      clubName: 'Developer Student Club',
      resourceId: 'res_alan_kay_auditorium',
      resourceName: 'Alan Kay Grand Auditorium',
      venueCapacity: 250,
      startTime: new Date(now + 48 * 3600000).toISOString(), // in 2 days
      endTime: new Date(now + 84 * 3600000).toISOString(),
      category: 'HACKATHON',
      status: 'PUBLISHED',
      prerequisites: [],
      dualScanRequired: false,
      registeredCount: 242,
      checkedInCount: 0,
      waitlistCount: 8,
      coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600',
      tags: ['Hackathon', 'Web3', 'AI', 'Hardware', 'Prizes'],
      createdAt: new Date(now - 7 * 86400000).toISOString()
    },
    {
      id: 'evt_drone_robotics',
      title: 'Autonomous Drone Navigation & SLAM Bootcamp',
      description: 'Build, program, and fly PX4 autonomous quadcopters using ROS2 and LiDAR point-cloud mapping.',
      organizerId: 'usr_organizer_priya',
      organizerName: 'Priya Patel',
      organizerEmail: 'priya.patel@stanford.edu',
      clubName: 'AeroRobotics Lab',
      resourceId: 'res_robotics_lab',
      resourceName: 'Robotics & Autonomous Systems Lab',
      venueCapacity: 30,
      startTime: new Date(now + 72 * 3600000).toISOString(),
      endTime: new Date(now + 76 * 3600000).toISOString(),
      category: 'WORKSHOP',
      status: 'PUBLISHED',
      prerequisites: [],
      dualScanRequired: true,
      registeredCount: 30, // 100% full!
      checkedInCount: 0,
      waitlistCount: 2,
      coverImage: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600',
      tags: ['Robotics', 'Drones', 'ROS2', 'SLAM'],
      createdAt: new Date(now - 4 * 86400000).toISOString()
    }
  ];
  await db.events.insertMany(events);

  // 5. Registrations & Signed Tickets
  // Past completed event: Aarav Sharma attended and received verified certificate
  const certHash = generateCertificateHash('tkt_past_aarav', 'evt_part1_completed', 'Aarav Sharma');
  const pastReg = {
    id: 'reg_past_aarav',
    eventId: 'evt_part1_completed',
    eventTitle: 'Intro to Neural Networks & Computer Vision (Part 1)',
    userId: 'usr_student_aarav',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.sharma@iitd.ac.in',
    studentId: '2023CSB1042',
    status: 'ATTENDED',
    ticketId: 'tkt_past_aarav',
    qrSignature: signTicket({
      ticketId: 'tkt_past_aarav',
      eventId: 'evt_part1_completed',
      userId: 'usr_student_aarav',
      timestamp: new Date(now - 10 * 86400000).toISOString()
    }),
    registeredAt: new Date(now - 15 * 86400000).toISOString(),
    checkedIn: true,
    checkedInAt: new Date(now - 10 * 86400000 + 10 * 60000).toISOString(),
    checkedInBy: 'Priya Patel (Gate 1)',
    exitScanCompleted: true,
    exitScannedAt: new Date(now - 10 * 86400000 + 175 * 60000).toISOString(),
    certificateGenerated: true,
    certificateHash: certHash,
    certificateIssuedAt: new Date(now - 9 * 86400000).toISOString()
  };

  // Aarav confirmed for HackTheCampus
  const hackReg = {
    id: 'reg_hack_aarav',
    eventId: 'evt_hackathon_main',
    eventTitle: 'HackTheCampus 2026: 36-Hour National Hackathon',
    userId: 'usr_student_aarav',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.sharma@iitd.ac.in',
    studentId: '2023CSB1042',
    status: 'CONFIRMED',
    ticketId: 'tkt_hack_aarav',
    qrSignature: signTicket({
      ticketId: 'tkt_hack_aarav',
      eventId: 'evt_hackathon_main',
      userId: 'usr_student_aarav',
      timestamp: new Date(now - 3 * 86400000).toISOString()
    }),
    registeredAt: new Date(now - 3 * 86400000).toISOString(),
    checkedIn: false,
    exitScanCompleted: false,
    certificateGenerated: false
  };

  // Chloe confirmed for Part 2 workshop (she has a valid ticket ready to scan!)
  const chloeTicketTime = new Date(now - 2 * 86400000).toISOString();
  const chloeReg = {
    id: 'reg_part2_chloe',
    eventId: 'evt_part2_upcoming',
    eventTitle: 'Deep Learning & Generative AI Workshop (Part 2)',
    userId: 'usr_student_chloe',
    userName: 'Chloe Bennett',
    userEmail: 'cbennett@stanford.edu',
    studentId: 'STAN-8891',
    status: 'CONFIRMED',
    ticketId: 'tkt_part2_chloe',
    qrSignature: signTicket({
      ticketId: 'tkt_part2_chloe',
      eventId: 'evt_part2_upcoming',
      userId: 'usr_student_chloe',
      timestamp: chloeTicketTime
    }),
    registeredAt: chloeTicketTime,
    checkedIn: false,
    exitScanCompleted: false,
    certificateGenerated: false
  };

  // Waitlisted student for Part 2 with active TTL Countdown!
  const waitlistPromotedReg = {
    id: 'reg_part2_waitlist_1',
    eventId: 'evt_part2_upcoming',
    eventTitle: 'Deep Learning & Generative AI Workshop (Part 2)',
    userId: 'usr_student_rohan',
    userName: 'Rohan Mehta',
    userEmail: 'rohan.mehta@iitb.ac.in',
    studentId: '2024EE2091',
    status: 'WAITLISTED',
    ticketId: 'tkt_waitlist_rohan',
    qrSignature: signTicket({
      ticketId: 'tkt_waitlist_rohan',
      eventId: 'evt_part2_upcoming',
      userId: 'usr_student_rohan',
      timestamp: new Date(now - 5 * 60000).toISOString()
    }),
    registeredAt: new Date(now - 2 * 86400000).toISOString(),
    waitlistPosition: 1,
    // Promoted 5 minutes ago with 25 minutes remaining out of 30-min window!
    waitlistPromotedAt: new Date(now - 5 * 60000).toISOString(),
    waitlistExpiresAt: new Date(now + 25 * 60000).toISOString(),
    checkedIn: false,
    exitScanCompleted: false,
    certificateGenerated: false
  };

  await db.registrations.insertMany([pastReg, hackReg, chloeReg, waitlistPromotedReg]);

  // 6. Equipment Checkout Log
  const checkoutLogs = [
    {
      id: 'chk_01',
      bookingId: 'bkg_sony_active',
      resourceId: 'res_sony_cine_rig',
      resourceName: 'Sony FX3 4K Cinema Camera Rig',
      userId: 'usr_organizer_priya',
      userName: 'Priya Patel',
      userEmail: 'priya.patel@stanford.edu',
      checkedOutAt: new Date(now - 3 * 3600000).toISOString(),
      checkedOutBy: 'Dr. Vikram Rao (Lab Manager)',
      expectedReturnTime: new Date(now + 3 * 3600000).toISOString(),
      actualReturnTime: null,
      conditionOnReturn: null,
      status: 'CHECKED_OUT'
    },
    {
      id: 'chk_02',
      bookingId: 'bkg_mic_returned',
      resourceId: 'res_sennheiser_mic',
      resourceName: 'Sennheiser EW-DX Wireless Dual Mic Kit',
      userId: 'usr_organizer_priya',
      userName: 'Priya Patel',
      userEmail: 'priya.patel@stanford.edu',
      checkedOutAt: new Date(now - 26 * 3600000).toISOString(),
      checkedOutBy: 'Dr. Vikram Rao (Lab Manager)',
      expectedReturnTime: new Date(now - 20 * 3600000).toISOString(),
      actualReturnTime: new Date(now - 21 * 3600000).toISOString(),
      conditionOnReturn: 'Good',
      damageNotes: 'Clean return, batteries charged.',
      status: 'RETURNED'
    },
    {
      id: 'chk_03',
      bookingId: 'bkg_proj_damaged',
      resourceId: 'res_epson_projector',
      resourceName: 'Epson Pro L1070U 7000-Lumen Laser Projector',
      userId: 'usr_student_rohan',
      userName: 'Rohan Mehta',
      userEmail: 'rohan.mehta@iitb.ac.in',
      checkedOutAt: new Date(now - 50 * 3600000).toISOString(),
      checkedOutBy: 'Dr. Vikram Rao (Lab Manager)',
      expectedReturnTime: new Date(now - 44 * 3600000).toISOString(),
      actualReturnTime: new Date(now - 42 * 3600000).toISOString(),
      conditionOnReturn: 'Damaged',
      damageNotes: 'HDMI Port 2 pin bent. Requires optical technician inspection.',
      status: 'RETURNED'
    }
  ];
  await db.checkoutLogs.insertMany(checkoutLogs);

  // 7. Initial Immutable Audit Logs
  const auditLogs = [
    {
      id: 'aud_01',
      timestamp: new Date(now - 10 * 86400000).toISOString(),
      actorId: 'usr_admin_malhotra',
      actorName: 'Dean K. Malhotra',
      actorRole: 'SUPER_ADMIN',
      action: 'APPROVE_RESOURCE_TIER',
      targetType: 'RESOURCE',
      targetId: 'res_alan_kay_auditorium',
      targetName: 'Alan Kay Grand Auditorium',
      details: 'Approved auditorium status for university-wide calendar bookings.',
      ipAddress: '192.168.1.10'
    },
    {
      id: 'aud_02',
      timestamp: new Date(now - 7 * 86400000).toISOString(),
      actorId: 'system',
      actorName: 'Automated No-Show System',
      actorRole: 'SUPER_ADMIN',
      action: 'ISSUE_STRIKE',
      targetType: 'STRIKE',
      targetId: 'usr_student_aarav',
      targetName: 'Aarav Sharma',
      details: 'Automated strike issued for unregistered absence at Open Source Campus Summit.',
      ipAddress: '127.0.0.1'
    },
    {
      id: 'aud_03',
      timestamp: new Date(now - 5 * 60000).toISOString(),
      actorId: 'system',
      actorName: 'Automated Waitlist TTL Worker',
      actorRole: 'SUPER_ADMIN',
      action: 'WAITLIST_PROMOTION',
      targetType: 'REGISTRATION',
      targetId: 'reg_part2_waitlist_1',
      targetName: 'Rohan Mehta',
      details: 'Promoted from waitlist position #1 with 30-minute claim TTL expiration window.',
      ipAddress: '127.0.0.1'
    }
  ];
  await db.auditLogs.insertMany(auditLogs);

  console.log('✅ Campus seed data populated successfully!');
}

module.exports = {
  seedDatabase
};
