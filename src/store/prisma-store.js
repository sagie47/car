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

function mapSyncRun(record) {
  return record
    ? {
        id: record.id,
        dealerId: record.dealerId,
        rooftopId: record.rooftopId,
        sourceType: record.sourceType,
        sourceName: record.sourceName,
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
      createdAt: event.createdAt.toISOString()
    }))
  };
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
    events: (record.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      metadata: cloneJson(event.metadata, {}),
      createdAt: event.createdAt.toISOString()
    }))
  };
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

  async getDealer(dealerId) {
    return mapDealer(await this.client.dealer.findUnique({ where: { id: dealerId } }));
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

  async getRooftop(rooftopId) {
    return mapRooftop(await this.client.rooftop.findUnique({ where: { id: rooftopId } }));
  }

  async saveSyncRun(syncRun) {
    const record = await this.client.inventorySyncRun.upsert({
      where: { id: syncRun.id },
      update: {
        dealerId: syncRun.dealerId,
        rooftopId: syncRun.rooftopId,
        sourceType: syncRun.sourceType,
        sourceName: toNullable(syncRun.sourceName),
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
        sourceType: syncRun.sourceType,
        sourceName: toNullable(syncRun.sourceName),
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
          suggestedResponse: lead.suggestedResponse
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
          suggestedResponse: lead.suggestedResponse
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
}
