import { API, GroupInfo, ProfileInfo } from 'zca-js';

export type ZaloGroupProfile = Pick<GroupInfo, 'groupId' | 'name' | 'desc' | 'fullAvt' | 'avt' | 'totalMember'>;

const groupProfileCache = new Map<string, { expiresAt: number; profile: ZaloGroupProfile }>();

export function invalidateZaloGroupProfile(accountKey: string, groupId: string) {
  groupProfileCache.delete(`${accountKey}:${groupId}`);
}

export async function getZaloUserProfile(api: API, userId: string): Promise<ProfileInfo | null> {
  if (!userId) return null;
  try {
    const response = await api.getUserInfo(userId);
    const profiles = Object.entries(response.changed_profiles ?? {});
    const match = response.changed_profiles?.[userId]
      ?? profiles.find(([key, profile]) => key.startsWith(`${userId}_`) || profile.userId === userId)?.[1]
      ?? profiles[0]?.[1];
    return match ?? null;
  } catch (error) {
    console.warn(`Không lấy được hồ sơ Zalo user ${userId}:`, error);
    return null;
  }
}

export async function getZaloGroupProfile(api: API, groupId: string, accountKey = ''): Promise<ZaloGroupProfile | null> {
  if (!groupId) return null;
  const key = `${accountKey}:${groupId}`;
  const cached = groupProfileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;
  try {
    const response = await api.getGroupInfo(groupId);
    const profile = response.gridInfoMap?.[groupId];
    if (!profile) return null;
    const result: ZaloGroupProfile = {
      groupId: profile.groupId,
      name: profile.name,
      desc: profile.desc,
      fullAvt: profile.fullAvt,
      avt: profile.avt,
      totalMember: profile.totalMember,
    };
    groupProfileCache.set(key, { profile: result, expiresAt: Date.now() + 60_000 });
    if (groupProfileCache.size > 500) {
      const firstKey = groupProfileCache.keys().next().value;
      if (firstKey) groupProfileCache.delete(firstKey);
    }
    return result;
  } catch (error) {
    console.warn(`Không lấy được thông tin Zalo group ${groupId}:`, error);
    return null;
  }
}
