import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard, RequestWithUser } from '@org/auth';
import { Role } from '@org/data';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { OrganisationsService } from './organisations.service';

@Controller('organisations')
@UseGuards(RolesGuard)
export class OrganisationsController {
  constructor(private organisations: OrganisationsService) {}

  @Post()
  @Roles(Role.Owner)
  async create(@Body() dto: CreateOrganisationDto, @Req() req: RequestWithUser) {
    return this.organisations.create(
      dto.name,
      dto.parentId,
      req.user!,
    );
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return this.organisations.findAll(req.user!);
  }

  @Delete(':id')
  @Roles(Role.Owner)
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.organisations.remove(id, req.user!);
  }
}
