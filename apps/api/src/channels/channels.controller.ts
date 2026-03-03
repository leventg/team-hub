import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ARCHITECT)
  create(@Body() dto: CreateChannelDto, @CurrentUser() user: User) {
    return this.channelsService.create(dto, user.id);
  }

  @Get()
  findAll(@Query('includeArchived') includeArchived?: string) {
    return this.channelsService.findAll(includeArchived === 'true');
  }

  @Get('my')
  getMyChannels(@CurrentUser() user: User) {
    return this.channelsService.getUserChannels(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.channelsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ARCHITECT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.update(id, dto, user.id);
  }

  @Post(':id/members/:userId')
  addMember(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.channelsService.addMember(channelId, userId, user.id);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) channelId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.channelsService.removeMember(channelId, userId);
  }

  @Get(':id/members')
  getMembers(@Param('id', ParseUUIDPipe) channelId: string) {
    return this.channelsService.getMembers(channelId);
  }
}
