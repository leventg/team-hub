import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { DecisionStatus } from './entities/decision.entity';

@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post()
  create(@Body() dto: CreateDecisionDto, @CurrentUser() user: User) {
    return this.decisionsService.create(dto, user.id);
  }

  @Get()
  findAll(@Query('status') status?: DecisionStatus) {
    return this.decisionsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.decisionsService.findById(id);
  }

  @Post(':id/vote')
  vote(
    @Param('id', ParseUUIDPipe) decisionId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: User,
  ) {
    dto.decisionId = decisionId;
    return this.decisionsService.vote(dto, user.id);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.ARCHITECT)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: DecisionStatus.APPROVED | DecisionStatus.REJECTED,
    @CurrentUser() user: User,
  ) {
    return this.decisionsService.resolve(id, status, user.id);
  }
}
