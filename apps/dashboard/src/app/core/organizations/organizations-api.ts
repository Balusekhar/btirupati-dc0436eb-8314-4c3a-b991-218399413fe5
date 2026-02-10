import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../http/api-client.service';

export interface ApiOrganization {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationDto {
  name: string;
  parentId?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationsApi {
  private readonly api = inject(ApiClientService);

  list(): Promise<ApiOrganization[]> {
    return this.api.get<ApiOrganization[]>('/organisations');
  }

  create(dto: CreateOrganizationDto): Promise<ApiOrganization> {
    return this.api.post<ApiOrganization>('/organisations', dto);
  }
}
