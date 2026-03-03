import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() dto: CreateMessageDto, @CurrentUser() user: User) {
    return this.messagesService.create(dto, user.id);
  }

  @Get('channel/:channelId')
  findByChannel(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagesService.findByChannel(channelId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.findById(id);
  }

  @Get(':id/replies')
  getReplies(@Param('id', ParseUUIDPipe) parentId: string) {
    return this.messagesService.getThreadReplies(parentId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.messagesService.softDelete(id, user.id);
  }
}
