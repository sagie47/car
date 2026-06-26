const ROLE_RANK = { salesperson: 1, manager: 2, owner: 3 };

export async function authorizeDealerAccess({ service, actor, dealerId, minimumRole = 'salesperson' }) {
  if (actor.bypass) return { role: 'owner' };
  const membership = await service.store.getMembership({ dealerId, userId: actor.id });
  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
    throw new Error('You do not have access to this dealer');
  }
  return membership;
}

export async function authorizeRooftopAccess({ service, actor, rooftopId, minimumRole = 'salesperson' }) {
  const rooftop = await service.getRooftop(rooftopId);
  const membership = await authorizeDealerAccess({ service, actor, dealerId: rooftop.dealerId, minimumRole });
  if (actor.bypass || membership.role === 'owner') return { rooftop, membership };

  const grants = await service.store.listRooftopAccess({ rooftopId, userId: actor.id });
  if (!grants.length) throw new Error('You do not have access to this rooftop');
  return { rooftop, membership };
}
