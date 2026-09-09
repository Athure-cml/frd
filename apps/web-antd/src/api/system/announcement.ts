import { requestClient } from '#/api/request';

export namespace AnnouncementApi {
  export type AnnouncementStatus =
    | 'DISABLED'
    | 'DRAFT'
    | 'EXPIRED'
    | 'PUBLISHED'
    | 'SCHEDULED';

  export type PublishMode = 'IMMEDIATE' | 'SCHEDULED';

  export type SaveAction =
    | 'DRAFT'
    | 'PUBLISH_IMMEDIATE'
    | 'PUBLISH_SCHEDULED'
    | 'SAVE';

  export interface Announcement {
    content: string;
    createdByName?: string;
    enabled?: boolean;
    expiresAt?: null | string;
    id: number;
    publishedAt?: null | string;
    readCount?: number;
    status: AnnouncementStatus;
    title: string;
    unreadCount?: number;
    validDays?: null | number;
  }

  export interface ListQuery {
    createdByName?: string;
    endAt?: string;
    keyword?: string;
    startAt?: string;
    status?: '' | AnnouncementStatus;
  }

  export interface SavePayload {
    content: string;
    saveAction: SaveAction;
    scheduledAt?: null | string;
    title: string;
    validDays?: null | number;
  }
}

export async function getPendingAnnouncements() {
  return requestClient.get<AnnouncementApi.Announcement[]>(
    '/sys/announcements/pending',
  );
}

export async function acknowledgeAnnouncement(id: number) {
  return requestClient.post(`/sys/announcements/${id}/ack`);
}

export async function getAnnouncementList(params?: AnnouncementApi.ListQuery) {
  return requestClient.get<AnnouncementApi.Announcement[]>(
    '/sys/announcements',
    { params },
  );
}

export async function createAnnouncement(data: AnnouncementApi.SavePayload) {
  return requestClient.post<AnnouncementApi.Announcement>(
    '/sys/announcements',
    data,
  );
}

export async function updateAnnouncement(
  id: number,
  data: AnnouncementApi.SavePayload,
) {
  return requestClient.put<AnnouncementApi.Announcement>(
    `/sys/announcements/${id}`,
    data,
  );
}

export async function copyAnnouncement(id: number) {
  return requestClient.post<AnnouncementApi.Announcement>(
    `/sys/announcements/${id}/copy`,
  );
}

export async function disableAnnouncement(id: number) {
  return requestClient.post<AnnouncementApi.Announcement>(
    `/sys/announcements/${id}/disable`,
  );
}

export async function deleteAnnouncement(id: number) {
  return requestClient.delete(`/sys/announcements/${id}`);
}
