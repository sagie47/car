import { LotPilotStore } from './lotpilot-store.js';

function cloneJson(value, fallback) {
  return JSON.parse(JSON.stringify(value ?? fallback));
}

function toNullable(value) {
  return value === undefined ? null : value;
}

function mapDealer(record) {
  return record
    ? {
        id: record.id,
        name: record.name,
        createdAt: record.createdAt.toISOString()
      }
    : null;
}

function mapUserProfile(record) {
  return record
    ? {
        id: record.id,
        email: record.email,
        displayName: record.displayName,
        phone: record.phone,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }
    : null;
}

function mapMembership(record) {
  return record
    ? {
        id: record.id,
        dealerId: record.dealerId,
        userId: record.userId,
        role: record.role,
        createdAt: record.createdAt.toISOString()
      }
    : null;
}

function mapRooftopAccess(record) {
  return record
    ? {
        id: record.id,
        rooftopId: record.rooftopId,
        userId: record.userId,
        createdAt: record.createdAt.toISOString()
      }
    : null;
}

function mapInvitation(record) {
  return record
    ? {
        id: record.id,
        dealerId: record.dealerId,
        email: record.email,
        role: record.role,
        rooftopIds: cloneJson(record.rooftopIds, []),
        status: record.status,
        invitedById: record.invitedById,
        createdAt: record.createdAt.toISOString(),
        acceptedAt: record.acceptedAt?.toISOString() ?? null
      }
    : null;
}

function mapRooftop(record) {
  return record
    ? {
        id: record.id,
        dealerId: record.dealerId,
        name: record.name,
        location: record.location,
        phone: record.phone,
        logoUrl: record.logoUrl,
        disclaimerText: record.disclaimerText,
        assignmentMode: record.assignmentMode,
        rules: cloneJson(record.rules, {}),
        createdAt: record.createdAt.toISOString()
      }
    : null;
}

function mapInventorySource(record) {
  return record
    ? {
        id: record.id,
        rooftopId: record.rooftopId,
        name: record.name,
        type: record.type,
        format: record.format,
        sourceUrl: record.sourceUrl,
        sourceConfig: cloneJson(record.sourceConfig, {}),
        isActive: record.isActive,
        lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
        lastSyncStatus: record.lastSyncStatus ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }
    : null;
}

function mapSyncRun(record) {
  return record
    ? {
        id: record.id,
        dealerId: record.dealerId,
        rooftopId: record.rooftopId,
        inventorySourceId: record.inventorySourceId ?? null,
        sourceType: record.sourceType,
        sourceName: record.sourceName,
        status: record.status,
        trigger: record.trigger,
        startedAt: record.startedAt.toISOString(),
        completedAt: record.completedAt?.toISOString() ?? null,
        rowsReceived: record.rowsReceived,
        rowsImported: record.rowsImported,
        rowsSkipped: record.rowsSkipped,
        duplicateVins: cloneJson(record.duplicateVins, []),
        errors: cloneJson(record.errors, [])
      }
    : null;
}

function mapVehicle(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    dealerId: record.dealerId,
    rooftopId: record.rooftopId,
    vin: record.vin ?? '',
    stockNumber: record.stockNumber ?? '',
    year: record.year,
    make: record.make ?? '',
    model: record.model ?? '',
    trim: record.trim ?? '',
    condition: record.condition ?? '',
    mileage: record.mileage,
    price: record.price,
    bodyStyle: record.bodyStyle ?? '',
    exteriorColor: record.exteriorColor ?? '',
    interiorColor: record.interiorColor ?? '',
    photoUrls: cloneJson(record.photoUrls, []),
    status: record.status ?? '',
    vdpUrl: record.vdpUrl ?? '',
    salespersonAssignment: record.salespersonAssignment ?? '',
    carfaxUrl: record.carfaxUrl ?? '',
    optionsList: cloneJson(record.optionsList, []),
    drivetrain: record.drivetrain ?? '',
    transmission: record.transmission ?? '',
    fuelType: record.fuelType ?? '',
    engine: record.engine ?? '',
    daysInInventory: record.daysInInventory,
    featured: record.featured,
    priceHistory: cloneJson(record.priceHistory, []),
    rawSource: cloneJson(record.rawSource, {}),
    naturalKey: record.naturalKey,
    sourceFingerprint: record.sourceFingerprint,
    syncIssues: cloneJson(record.syncIssues, []),
    isStale: record.isStale,
    eligibility: cloneJson(record.eligibility, {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    snapshots: (record.snapshots ?? []).map((snapshot) => ({
      id: snapshot.id,
      syncRunId: snapshot.syncRunId,
      capturedAt: snapshot.capturedAt.toISOString(),
      fingerprint: snapshot.fingerprint,
      rawSource: cloneJson(snapshot.rawSource, {})
    }))
  };
}

function mapListing(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    vehicleId: record.vehicleId,
    rooftopId: record.rooftopId,
    state: record.state,
    draft: cloneJson(record.draft, {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    events: (record.events ?? []).map((event) => ({
      id: event.id,
      fromState: event.fromState,
      toState: event.toState,
      actor: event.actor,
      reason: event.reason,
      metadata: cloneJson(event.metadata, {}),
      eventType: event.eventType,
      createdAt: event.createdAt.toISOString()
    }))
  };
}

function mapPostingAccount(record) {
  return record
    ? {
        id: record.id,
        rooftopId: record.rooftopId,
        platform: record.platform,
        label: record.label,
        status: record.status,
        dailyCapacity: record.dailyCapacity,
        spacingMinutes: record.spacingMinutes,
        autoSubmitEnabled: record.autoSubmitEnabled,
        settings: cloneJson(record.settings, {}),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }
    : null;
}

function mapPostingAttempt(record) {
  return record
    ? {
        id: record.id,
        jobId: record.jobId,
        status: record.status,
        method: record.method,
        startedAt: record.startedAt.toISOString(),
        completedAt: record.completedAt?.toISOString() ?? null,
        result: cloneJson(record.result, {}),
        error: record.error,
        metadata: cloneJson(record.metadata, {})
      }
    : null;
}

function mapPostingJob(record) {
  return record
    ? {
        id: record.id,
        rooftopId: record.rooftopId,
        listingId: record.listingId,
        vehicleId: record.vehicleId,
        accountId: record.accountId,
        action: record.action,
        status: record.status,
        priority: record.priority,
        scheduledFor: record.scheduledFor.toISOString(),
        claimedAt: record.claimedAt?.toISOString() ?? null,
        completedAt: record.completedAt?.toISOString() ?? null,
        failedAt: record.failedAt?.toISOString() ?? null,
        snoozedUntil: record.snoozedUntil?.toISOString() ?? null,
        liveUrl: record.liveUrl,
        lastError: record.lastError,
        complianceChecks: cloneJson(record.complianceChecks, []),
        metadata: cloneJson(record.metadata, {}),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        attempts: (record.attempts ?? []).map(mapPostingAttempt)
      }
    : null;
}

function mapLead(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    vehicleId: record.vehicleId,
    rooftopId: record.rooftopId,
    sourceChannel: record.sourceChannel,
    sourceSubchannel: record.sourceSubchannel,
    assignedRepId: record.assignedRepId,
    createdAt: record.createdAt.toISOString(),
    firstResponseAt: record.firstResponseAt?.toISOString() ?? null,
    status: record.status,
    disposition: record.disposition,
    appointmentSet: record.appointmentSet,
    sold: record.sold,
    attributedValue: record.attributedValue,
    suggestedResponse: record.suggestedResponse,
    contactName: record.contactName,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    sourceMessage: record.sourceMessage,
    externalId: record.externalId,
    events: (record.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      metadata: cloneJson(event.metadata, {}),
      createdAt: event.createdAt.toISOString()
    }))
  };
}

function mapNotificationRecipient(record) {
  return record
    ? {
        id: record.id,
        rooftopId: record.rooftopId,
        userId: record.userId,
        channel: record.channel,
        destination: record.destination,
        label: record.label,
        rules: cloneJson(record.rules, {}),
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }
    : null;
}

function mapInboundEvent(record) {
  return record
    ? {
        id: record.id,
        provider: record.provider,
        externalId: record.externalId,
        rooftopId: record.rooftopId,
        leadId: record.leadId,
        payload: cloneJson(record.payload, {}),
        receivedAt: record.receivedAt.toISOString()
      }
    : null;
}

function mapNotificationDelivery(record) {
  return record
    ? {
        id: record.id,
        leadId: record.leadId,
        recipientId: record.recipientId,
        channel: record.channel,
        status: record.status,
        attempts: record.attempts,
        providerId: record.providerId,
        lastError: record.lastError,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }
    : null;
}

export class PrismaStore extends LotPilotStore {
  constructor({ client }) {
    super();
    this.client = client;
  }

  async saveDealer(dealer) {
    const record = await this.client.dealer.upsert({
      where: { id: dealer.id },
      update: {
        name: dealer.name,
        createdAt: new Date(dealer.createdAt)
      },
      create: {
        id: dealer.id,
        name: dealer.name,
        createdAt: new Date(dealer.createdAt)
      }
    });

    return mapDealer(record);
  }

  async listDealers() {
    const records = await this.client.dealer.findMany({
      orderBy: { createdAt: 'asc' }
    });

    return records.map(mapDealer);
  }

  async getDealer(dealerId) {
    return mapDealer(await this.client.dealer.findUnique({ where: { id: dealerId } }));
  }

  async saveUserProfile(user) {
    const record = await this.client.userProfile.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        displayName: toNullable(user.displayName),
        phone: toNullable(user.phone),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      },
      create: {
        id: user.id,
        email: user.email,
        displayName: toNullable(user.displayName),
        phone: toNullable(user.phone),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }
    });

    return mapUserProfile(record);
  }

  async getUserProfile(userId) {
    return mapUserProfile(await this.client.userProfile.findUnique({ where: { id: userId } }));
  }

  async getUserProfileByEmail(email) {
    return mapUserProfile(await this.client.userProfile.findUnique({ where: { email } }));
  }

  async saveMembership(membership) {
    const record = await this.client.dealerMembership.upsert({
      where: { dealerId_userId: { dealerId: membership.dealerId, userId: membership.userId } },
      update: {
        role: membership.role,
        createdAt: new Date(membership.createdAt)
      },
      create: {
        id: membership.id,
        dealerId: membership.dealerId,
        userId: membership.userId,
        role: membership.role,
        createdAt: new Date(membership.createdAt)
      }
    });

    return mapMembership(record);
  }

  async getMembership({ dealerId, userId }) {
    return mapMembership(
      await this.client.dealerMembership.findUnique({ where: { dealerId_userId: { dealerId, userId } } })
    );
  }

  async listMemberships({ dealerId, userId } = {}) {
    const records = await this.client.dealerMembership.findMany({
      where: {
        ...(dealerId ? { dealerId } : {}),
        ...(userId ? { userId } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapMembership);
  }

  async saveRooftopAccess(access) {
    const record = await this.client.rooftopAccess.upsert({
      where: { rooftopId_userId: { rooftopId: access.rooftopId, userId: access.userId } },
      update: { createdAt: new Date(access.createdAt) },
      create: {
        id: access.id,
        rooftopId: access.rooftopId,
        userId: access.userId,
        createdAt: new Date(access.createdAt)
      }
    });
    return mapRooftopAccess(record);
  }

  async listRooftopAccess({ rooftopId, userId } = {}) {
    const records = await this.client.rooftopAccess.findMany({
      where: {
        ...(rooftopId ? { rooftopId } : {}),
        ...(userId ? { userId } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapRooftopAccess);
  }

  async saveInvitation(invitation) {
    const record = await this.client.dealerInvitation.upsert({
      where: { id: invitation.id },
      update: {
        dealerId: invitation.dealerId,
        email: invitation.email,
        role: invitation.role,
        rooftopIds: cloneJson(invitation.rooftopIds, []),
        status: invitation.status,
        invitedById: toNullable(invitation.invitedById),
        createdAt: new Date(invitation.createdAt),
        acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null
      },
      create: {
        id: invitation.id,
        dealerId: invitation.dealerId,
        email: invitation.email,
        role: invitation.role,
        rooftopIds: cloneJson(invitation.rooftopIds, []),
        status: invitation.status,
        invitedById: toNullable(invitation.invitedById),
        createdAt: new Date(invitation.createdAt),
        acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null
      }
    });
    return mapInvitation(record);
  }

  async getInvitation(invitationId) {
    return mapInvitation(await this.client.dealerInvitation.findUnique({ where: { id: invitationId } }));
  }

  async listInvitations({ email, status } = {}) {
    const records = await this.client.dealerInvitation.findMany({
      where: {
        ...(email ? { email } : {}),
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapInvitation);
  }

  async saveRooftop(rooftop) {
    const record = await this.client.rooftop.upsert({
      where: { id: rooftop.id },
      update: {
        dealerId: rooftop.dealerId,
        name: rooftop.name,
        location: toNullable(rooftop.location),
        phone: toNullable(rooftop.phone),
        logoUrl: toNullable(rooftop.logoUrl),
        disclaimerText: toNullable(rooftop.disclaimerText),
        assignmentMode: rooftop.assignmentMode,
        rules: cloneJson(rooftop.rules, {}),
        createdAt: new Date(rooftop.createdAt)
      },
      create: {
        id: rooftop.id,
        dealerId: rooftop.dealerId,
        name: rooftop.name,
        location: toNullable(rooftop.location),
        phone: toNullable(rooftop.phone),
        logoUrl: toNullable(rooftop.logoUrl),
        disclaimerText: toNullable(rooftop.disclaimerText),
        assignmentMode: rooftop.assignmentMode,
        rules: cloneJson(rooftop.rules, {}),
        createdAt: new Date(rooftop.createdAt)
      }
    });

    return mapRooftop(record);
  }

  async listRooftops({ dealerId } = {}) {
    const records = await this.client.rooftop.findMany({
      where: dealerId ? { dealerId } : undefined,
      orderBy: { createdAt: 'asc' }
    });

    return records.map(mapRooftop);
  }

  async getRooftop(rooftopId) {
    return mapRooftop(await this.client.rooftop.findUnique({ where: { id: rooftopId } }));
  }

  async saveInventorySource(inventorySource) {
    const record = await this.client.inventorySource.upsert({
      where: { id: inventorySource.id },
      update: {
        rooftopId: inventorySource.rooftopId,
        name: inventorySource.name,
        type: inventorySource.type,
        format: inventorySource.format,
        sourceUrl: inventorySource.sourceUrl,
        sourceConfig: cloneJson(inventorySource.sourceConfig, {}),
        isActive: Boolean(inventorySource.isActive),
        lastSyncedAt: inventorySource.lastSyncedAt ? new Date(inventorySource.lastSyncedAt) : null,
        lastSyncStatus: toNullable(inventorySource.lastSyncStatus),
        createdAt: new Date(inventorySource.createdAt),
        updatedAt: new Date(inventorySource.updatedAt)
      },
      create: {
        id: inventorySource.id,
        rooftopId: inventorySource.rooftopId,
        name: inventorySource.name,
        type: inventorySource.type,
        format: inventorySource.format,
        sourceUrl: inventorySource.sourceUrl,
        sourceConfig: cloneJson(inventorySource.sourceConfig, {}),
        isActive: Boolean(inventorySource.isActive),
        lastSyncedAt: inventorySource.lastSyncedAt ? new Date(inventorySource.lastSyncedAt) : null,
        lastSyncStatus: toNullable(inventorySource.lastSyncStatus),
        createdAt: new Date(inventorySource.createdAt),
        updatedAt: new Date(inventorySource.updatedAt)
      }
    });

    return mapInventorySource(record);
  }

  async getInventorySource(inventorySourceId) {
    return mapInventorySource(await this.client.inventorySource.findUnique({ where: { id: inventorySourceId } }));
  }

  async listInventorySources({ rooftopId } = {}) {
    const records = await this.client.inventorySource.findMany({
      where: rooftopId ? { rooftopId } : undefined,
      orderBy: { createdAt: 'asc' }
    });

    return records.map(mapInventorySource);
  }

  async saveSyncRun(syncRun) {
    const record = await this.client.inventorySyncRun.upsert({
      where: { id: syncRun.id },
      update: {
        dealerId: syncRun.dealerId,
        rooftopId: syncRun.rooftopId,
        inventorySourceId: toNullable(syncRun.inventorySourceId),
        sourceType: syncRun.sourceType,
        sourceName: toNullable(syncRun.sourceName),
        status: syncRun.status,
        trigger: syncRun.trigger,
        startedAt: new Date(syncRun.startedAt),
        completedAt: syncRun.completedAt ? new Date(syncRun.completedAt) : null,
        rowsReceived: syncRun.rowsReceived,
        rowsImported: syncRun.rowsImported,
        rowsSkipped: syncRun.rowsSkipped,
        duplicateVins: cloneJson(syncRun.duplicateVins, []),
        errors: cloneJson(syncRun.errors, [])
      },
      create: {
        id: syncRun.id,
        dealerId: syncRun.dealerId,
        rooftopId: syncRun.rooftopId,
        inventorySourceId: toNullable(syncRun.inventorySourceId),
        sourceType: syncRun.sourceType,
        sourceName: toNullable(syncRun.sourceName),
        status: syncRun.status,
        trigger: syncRun.trigger,
        startedAt: new Date(syncRun.startedAt),
        completedAt: syncRun.completedAt ? new Date(syncRun.completedAt) : null,
        rowsReceived: syncRun.rowsReceived,
        rowsImported: syncRun.rowsImported,
        rowsSkipped: syncRun.rowsSkipped,
        duplicateVins: cloneJson(syncRun.duplicateVins, []),
        errors: cloneJson(syncRun.errors, [])
      }
    });

    return mapSyncRun(record);
  }

  async getSyncRun(syncRunId) {
    return mapSyncRun(await this.client.inventorySyncRun.findUnique({ where: { id: syncRunId } }));
  }

  async listSyncRuns({ rooftopId, inventorySourceId, status } = {}) {
    const where = {
      ...(rooftopId ? { rooftopId } : {}),
      ...(inventorySourceId ? { inventorySourceId } : {}),
      ...(status ? { status } : {})
    };
    const records = await this.client.inventorySyncRun.findMany({
      where,
      orderBy: { startedAt: 'desc' }
    });

    return records.map(mapSyncRun);
  }

  async getVehicleByNaturalKey(naturalKey) {
    return mapVehicle(
      await this.client.vehicle.findUnique({
        where: { naturalKey },
        include: {
          snapshots: {
            orderBy: { capturedAt: 'asc' }
          }
        }
      })
    );
  }

  async saveVehicle(vehicle) {
    await this.client.$transaction(async (tx) => {
      await tx.vehicle.upsert({
        where: { id: vehicle.id },
        update: {
          dealerId: vehicle.dealerId,
          rooftopId: vehicle.rooftopId,
          vin: toNullable(vehicle.vin),
          stockNumber: toNullable(vehicle.stockNumber),
          year: vehicle.year ?? null,
          make: toNullable(vehicle.make),
          model: toNullable(vehicle.model),
          trim: toNullable(vehicle.trim),
          condition: toNullable(vehicle.condition),
          mileage: vehicle.mileage ?? null,
          price: vehicle.price ?? null,
          bodyStyle: toNullable(vehicle.bodyStyle),
          exteriorColor: toNullable(vehicle.exteriorColor),
          interiorColor: toNullable(vehicle.interiorColor),
          photoUrls: cloneJson(vehicle.photoUrls, []),
          status: toNullable(vehicle.status),
          vdpUrl: toNullable(vehicle.vdpUrl),
          salespersonAssignment: toNullable(vehicle.salespersonAssignment),
          carfaxUrl: toNullable(vehicle.carfaxUrl),
          optionsList: cloneJson(vehicle.optionsList, []),
          drivetrain: toNullable(vehicle.drivetrain),
          transmission: toNullable(vehicle.transmission),
          fuelType: toNullable(vehicle.fuelType),
          engine: toNullable(vehicle.engine),
          daysInInventory: vehicle.daysInInventory ?? null,
          featured: Boolean(vehicle.featured),
          priceHistory: cloneJson(vehicle.priceHistory, []),
          rawSource: cloneJson(vehicle.rawSource, {}),
          naturalKey: vehicle.naturalKey,
          sourceFingerprint: vehicle.sourceFingerprint,
          syncIssues: cloneJson(vehicle.syncIssues, []),
          isStale: Boolean(vehicle.isStale),
          eligibility: cloneJson(vehicle.eligibility, {}),
          createdAt: new Date(vehicle.createdAt),
          updatedAt: new Date(vehicle.updatedAt)
        },
        create: {
          id: vehicle.id,
          dealerId: vehicle.dealerId,
          rooftopId: vehicle.rooftopId,
          vin: toNullable(vehicle.vin),
          stockNumber: toNullable(vehicle.stockNumber),
          year: vehicle.year ?? null,
          make: toNullable(vehicle.make),
          model: toNullable(vehicle.model),
          trim: toNullable(vehicle.trim),
          condition: toNullable(vehicle.condition),
          mileage: vehicle.mileage ?? null,
          price: vehicle.price ?? null,
          bodyStyle: toNullable(vehicle.bodyStyle),
          exteriorColor: toNullable(vehicle.exteriorColor),
          interiorColor: toNullable(vehicle.interiorColor),
          photoUrls: cloneJson(vehicle.photoUrls, []),
          status: toNullable(vehicle.status),
          vdpUrl: toNullable(vehicle.vdpUrl),
          salespersonAssignment: toNullable(vehicle.salespersonAssignment),
          carfaxUrl: toNullable(vehicle.carfaxUrl),
          optionsList: cloneJson(vehicle.optionsList, []),
          drivetrain: toNullable(vehicle.drivetrain),
          transmission: toNullable(vehicle.transmission),
          fuelType: toNullable(vehicle.fuelType),
          engine: toNullable(vehicle.engine),
          daysInInventory: vehicle.daysInInventory ?? null,
          featured: Boolean(vehicle.featured),
          priceHistory: cloneJson(vehicle.priceHistory, []),
          rawSource: cloneJson(vehicle.rawSource, {}),
          naturalKey: vehicle.naturalKey,
          sourceFingerprint: vehicle.sourceFingerprint,
          syncIssues: cloneJson(vehicle.syncIssues, []),
          isStale: Boolean(vehicle.isStale),
          eligibility: cloneJson(vehicle.eligibility, {}),
          createdAt: new Date(vehicle.createdAt),
          updatedAt: new Date(vehicle.updatedAt)
        }
      });

      for (const snapshot of vehicle.snapshots ?? []) {
        await tx.vehicleSnapshot.upsert({
          where: { id: snapshot.id },
          update: {
            vehicleId: vehicle.id,
            syncRunId: snapshot.syncRunId,
            capturedAt: new Date(snapshot.capturedAt),
            fingerprint: snapshot.fingerprint,
            rawSource: cloneJson(snapshot.rawSource, {})
          },
          create: {
            id: snapshot.id,
            vehicleId: vehicle.id,
            syncRunId: snapshot.syncRunId,
            capturedAt: new Date(snapshot.capturedAt),
            fingerprint: snapshot.fingerprint,
            rawSource: cloneJson(snapshot.rawSource, {})
          }
        });
      }
    });

    return this.getVehicle(vehicle.id);
  }

  async getVehicle(vehicleId) {
    return mapVehicle(
      await this.client.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          snapshots: {
            orderBy: { capturedAt: 'asc' }
          }
        }
      })
    );
  }

  async listVehicles({ rooftopId } = {}) {
    const records = await this.client.vehicle.findMany({
      where: rooftopId ? { rooftopId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        snapshots: {
          orderBy: { capturedAt: 'asc' }
        }
      }
    });

    return records.map(mapVehicle);
  }

  async saveListing(listing) {
    await this.client.$transaction(async (tx) => {
      await tx.listing.upsert({
        where: { id: listing.id },
        update: {
          vehicleId: listing.vehicleId,
          rooftopId: listing.rooftopId,
          state: listing.state,
          draft: cloneJson(listing.draft, {}),
          createdAt: new Date(listing.createdAt),
          updatedAt: new Date(listing.updatedAt)
        },
        create: {
          id: listing.id,
          vehicleId: listing.vehicleId,
          rooftopId: listing.rooftopId,
          state: listing.state,
          draft: cloneJson(listing.draft, {}),
          createdAt: new Date(listing.createdAt),
          updatedAt: new Date(listing.updatedAt)
        }
      });

      for (const event of listing.events ?? []) {
        await tx.listingEvent.upsert({
          where: { id: event.id },
          update: {
            listingId: listing.id,
            fromState: toNullable(event.fromState),
            toState: event.toState,
            actor: event.actor,
            reason: toNullable(event.reason),
            metadata: cloneJson(event.metadata, {}),
            eventType: event.eventType ?? 'state_transition',
            createdAt: new Date(event.createdAt)
          },
          create: {
            id: event.id,
            listingId: listing.id,
            fromState: toNullable(event.fromState),
            toState: event.toState,
            actor: event.actor,
            reason: toNullable(event.reason),
            metadata: cloneJson(event.metadata, {}),
            eventType: event.eventType ?? 'state_transition',
            createdAt: new Date(event.createdAt)
          }
        });
      }
    });

    return this.getListing(listing.id);
  }

  async getListing(listingId) {
    return mapListing(
      await this.client.listing.findUnique({
        where: { id: listingId },
        include: {
          events: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    );
  }

  async getListingByVehicleId(vehicleId) {
    return mapListing(
      await this.client.listing.findUnique({
        where: { vehicleId },
        include: {
          events: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    );
  }

  async listListings({ rooftopId } = {}) {
    const records = await this.client.listing.findMany({
      where: rooftopId ? { rooftopId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return records.map(mapListing);
  }

  async savePostingAccount(account) {
    const record = await this.client.postingAccount.upsert({
      where: { id: account.id },
      update: {
        rooftopId: account.rooftopId,
        platform: account.platform,
        label: account.label,
        status: account.status,
        dailyCapacity: account.dailyCapacity,
        spacingMinutes: account.spacingMinutes,
        autoSubmitEnabled: Boolean(account.autoSubmitEnabled),
        settings: cloneJson(account.settings, {}),
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
      },
      create: {
        id: account.id,
        rooftopId: account.rooftopId,
        platform: account.platform,
        label: account.label,
        status: account.status,
        dailyCapacity: account.dailyCapacity,
        spacingMinutes: account.spacingMinutes,
        autoSubmitEnabled: Boolean(account.autoSubmitEnabled),
        settings: cloneJson(account.settings, {}),
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
      }
    });
    return mapPostingAccount(record);
  }

  async getPostingAccount(accountId) {
    return mapPostingAccount(await this.client.postingAccount.findUnique({ where: { id: accountId } }));
  }

  async listPostingAccounts({ rooftopId, status } = {}) {
    const records = await this.client.postingAccount.findMany({
      where: {
        ...(rooftopId ? { rooftopId } : {}),
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapPostingAccount);
  }

  async savePostingJob(job) {
    const record = await this.client.postingJob.upsert({
      where: { id: job.id },
      update: {
        rooftopId: job.rooftopId,
        listingId: job.listingId,
        vehicleId: job.vehicleId,
        accountId: toNullable(job.accountId),
        action: job.action,
        status: job.status,
        priority: job.priority,
        scheduledFor: new Date(job.scheduledFor),
        claimedAt: job.claimedAt ? new Date(job.claimedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
        failedAt: job.failedAt ? new Date(job.failedAt) : null,
        snoozedUntil: job.snoozedUntil ? new Date(job.snoozedUntil) : null,
        liveUrl: toNullable(job.liveUrl),
        lastError: toNullable(job.lastError),
        complianceChecks: cloneJson(job.complianceChecks, []),
        metadata: cloneJson(job.metadata, {}),
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt)
      },
      create: {
        id: job.id,
        rooftopId: job.rooftopId,
        listingId: job.listingId,
        vehicleId: job.vehicleId,
        accountId: toNullable(job.accountId),
        action: job.action,
        status: job.status,
        priority: job.priority,
        scheduledFor: new Date(job.scheduledFor),
        claimedAt: job.claimedAt ? new Date(job.claimedAt) : null,
        completedAt: job.completedAt ? new Date(job.completedAt) : null,
        failedAt: job.failedAt ? new Date(job.failedAt) : null,
        snoozedUntil: job.snoozedUntil ? new Date(job.snoozedUntil) : null,
        liveUrl: toNullable(job.liveUrl),
        lastError: toNullable(job.lastError),
        complianceChecks: cloneJson(job.complianceChecks, []),
        metadata: cloneJson(job.metadata, {}),
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt)
      },
      include: {
        attempts: {
          orderBy: { startedAt: 'asc' }
        }
      }
    });
    return mapPostingJob(record);
  }

  async getPostingJob(jobId) {
    return mapPostingJob(
      await this.client.postingJob.findUnique({
        where: { id: jobId },
        include: {
          attempts: {
            orderBy: { startedAt: 'asc' }
          }
        }
      })
    );
  }

  async listPostingJobs({ rooftopId, listingId, status, active } = {}) {
    const activeStatuses = ['pending', 'blocked', 'claimed', 'in_progress', 'needs_manual_review'];
    const records = await this.client.postingJob.findMany({
      where: {
        ...(rooftopId ? { rooftopId } : {}),
        ...(listingId ? { listingId } : {}),
        ...(status ? { status } : {}),
        ...(active === undefined ? {} : { status: active ? { in: activeStatuses } : { notIn: activeStatuses } })
      },
      orderBy: [{ scheduledFor: 'asc' }, { priority: 'desc' }],
      include: {
        attempts: {
          orderBy: { startedAt: 'asc' }
        }
      }
    });
    return records.map(mapPostingJob);
  }

  async savePostingAttempt(attempt) {
    const record = await this.client.postingAttempt.upsert({
      where: { id: attempt.id },
      update: {
        jobId: attempt.jobId,
        status: attempt.status,
        method: attempt.method,
        startedAt: new Date(attempt.startedAt),
        completedAt: attempt.completedAt ? new Date(attempt.completedAt) : null,
        result: cloneJson(attempt.result, {}),
        error: toNullable(attempt.error),
        metadata: cloneJson(attempt.metadata, {})
      },
      create: {
        id: attempt.id,
        jobId: attempt.jobId,
        status: attempt.status,
        method: attempt.method,
        startedAt: new Date(attempt.startedAt),
        completedAt: attempt.completedAt ? new Date(attempt.completedAt) : null,
        result: cloneJson(attempt.result, {}),
        error: toNullable(attempt.error),
        metadata: cloneJson(attempt.metadata, {})
      }
    });
    return mapPostingAttempt(record);
  }

  async listPostingAttempts({ jobId } = {}) {
    const records = await this.client.postingAttempt.findMany({
      where: jobId ? { jobId } : undefined,
      orderBy: { startedAt: 'asc' }
    });
    return records.map(mapPostingAttempt);
  }

  async saveLead(lead) {
    await this.client.$transaction(async (tx) => {
      await tx.lead.upsert({
        where: { id: lead.id },
        update: {
          vehicleId: lead.vehicleId,
          rooftopId: lead.rooftopId,
          sourceChannel: lead.sourceChannel,
          sourceSubchannel: toNullable(lead.sourceSubchannel),
          assignedRepId: toNullable(lead.assignedRepId),
          createdAt: new Date(lead.createdAt),
          firstResponseAt: lead.firstResponseAt ? new Date(lead.firstResponseAt) : null,
          status: lead.status,
          disposition: toNullable(lead.disposition),
          appointmentSet: Boolean(lead.appointmentSet),
          sold: Boolean(lead.sold),
          attributedValue: lead.attributedValue ?? null,
          suggestedResponse: lead.suggestedResponse,
          contactName: toNullable(lead.contactName),
          contactEmail: toNullable(lead.contactEmail),
          contactPhone: toNullable(lead.contactPhone),
          sourceMessage: toNullable(lead.sourceMessage),
          externalId: toNullable(lead.externalId)
        },
        create: {
          id: lead.id,
          vehicleId: lead.vehicleId,
          rooftopId: lead.rooftopId,
          sourceChannel: lead.sourceChannel,
          sourceSubchannel: toNullable(lead.sourceSubchannel),
          assignedRepId: toNullable(lead.assignedRepId),
          createdAt: new Date(lead.createdAt),
          firstResponseAt: lead.firstResponseAt ? new Date(lead.firstResponseAt) : null,
          status: lead.status,
          disposition: toNullable(lead.disposition),
          appointmentSet: Boolean(lead.appointmentSet),
          sold: Boolean(lead.sold),
          attributedValue: lead.attributedValue ?? null,
          suggestedResponse: lead.suggestedResponse,
          contactName: toNullable(lead.contactName),
          contactEmail: toNullable(lead.contactEmail),
          contactPhone: toNullable(lead.contactPhone),
          sourceMessage: toNullable(lead.sourceMessage),
          externalId: toNullable(lead.externalId)
        }
      });

      for (const event of lead.events ?? []) {
        await tx.leadEvent.upsert({
          where: { id: event.id },
          update: {
            leadId: lead.id,
            type: event.type,
            actor: event.actor,
            metadata: cloneJson(event.metadata, {}),
            createdAt: new Date(event.createdAt)
          },
          create: {
            id: event.id,
            leadId: lead.id,
            type: event.type,
            actor: event.actor,
            metadata: cloneJson(event.metadata, {}),
            createdAt: new Date(event.createdAt)
          }
        });
      }
    });

    return this.getLead(lead.id);
  }

  async getLead(leadId) {
    return mapLead(
      await this.client.lead.findUnique({
        where: { id: leadId },
        include: {
          events: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    );
  }

  async listLeads({ rooftopId, status } = {}) {
    const where = {
      ...(rooftopId ? { rooftopId } : {}),
      ...(status ? { status } : {})
    };
    const records = await this.client.lead.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return records.map(mapLead);
  }

  async saveNotificationRecipient(recipient) {
    const where = {
      rooftopId_channel_destination: {
        rooftopId: recipient.rooftopId,
        channel: recipient.channel,
        destination: recipient.destination
      }
    };
    const record = await this.client.notificationRecipient.upsert({
      where,
      update: {
        userId: toNullable(recipient.userId),
        label: toNullable(recipient.label),
        rules: cloneJson(recipient.rules, {}),
        isActive: Boolean(recipient.isActive),
        updatedAt: new Date(recipient.updatedAt)
      },
      create: {
        id: recipient.id,
        rooftopId: recipient.rooftopId,
        userId: toNullable(recipient.userId),
        channel: recipient.channel,
        destination: recipient.destination,
        label: toNullable(recipient.label),
        rules: cloneJson(recipient.rules, {}),
        isActive: Boolean(recipient.isActive),
        createdAt: new Date(recipient.createdAt),
        updatedAt: new Date(recipient.updatedAt)
      }
    });
    return mapNotificationRecipient(record);
  }

  async getNotificationRecipient(recipientId) {
    return mapNotificationRecipient(await this.client.notificationRecipient.findUnique({ where: { id: recipientId } }));
  }

  async listNotificationRecipients({ rooftopId, isActive } = {}) {
    const records = await this.client.notificationRecipient.findMany({
      where: {
        ...(rooftopId ? { rooftopId } : {}),
        ...(isActive === undefined ? {} : { isActive })
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapNotificationRecipient);
  }

  async saveInboundEvent(event) {
    const record = await this.client.inboundEvent.upsert({
      where: { externalId: event.externalId },
      update: {
        provider: event.provider,
        rooftopId: event.rooftopId,
        leadId: toNullable(event.leadId),
        payload: cloneJson(event.payload, {}),
        receivedAt: new Date(event.receivedAt)
      },
      create: {
        id: event.id,
        provider: event.provider,
        externalId: event.externalId,
        rooftopId: event.rooftopId,
        leadId: toNullable(event.leadId),
        payload: cloneJson(event.payload, {}),
        receivedAt: new Date(event.receivedAt)
      }
    });
    return mapInboundEvent(record);
  }

  async getInboundEventByExternalId(externalId) {
    return mapInboundEvent(await this.client.inboundEvent.findUnique({ where: { externalId } }));
  }

  async saveNotificationDelivery(delivery) {
    const record = await this.client.notificationDelivery.upsert({
      where: { id: delivery.id },
      update: {
        leadId: delivery.leadId,
        recipientId: delivery.recipientId,
        channel: delivery.channel,
        status: delivery.status,
        attempts: delivery.attempts,
        providerId: toNullable(delivery.providerId),
        lastError: toNullable(delivery.lastError),
        createdAt: new Date(delivery.createdAt),
        updatedAt: new Date(delivery.updatedAt)
      },
      create: {
        id: delivery.id,
        leadId: delivery.leadId,
        recipientId: delivery.recipientId,
        channel: delivery.channel,
        status: delivery.status,
        attempts: delivery.attempts,
        providerId: toNullable(delivery.providerId),
        lastError: toNullable(delivery.lastError),
        createdAt: new Date(delivery.createdAt),
        updatedAt: new Date(delivery.updatedAt)
      }
    });
    return mapNotificationDelivery(record);
  }

  async listNotificationDeliveries({ leadId, status } = {}) {
    const records = await this.client.notificationDelivery.findMany({
      where: {
        ...(leadId ? { leadId } : {}),
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: 'asc' }
    });
    return records.map(mapNotificationDelivery);
  }
}
