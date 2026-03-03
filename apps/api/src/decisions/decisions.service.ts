import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decision, DecisionStatus } from './entities/decision.entity';
import { Vote } from './entities/vote.entity';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import {
  BusinessException,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(
    @InjectRepository(Decision)
    private readonly decisionRepository: Repository<Decision>,
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
  ) {}

  async create(dto: CreateDecisionDto, proposerId: string): Promise<Decision> {
    const decision = this.decisionRepository.create({
      title: dto.title,
      description: dto.description,
      channelId: dto.channelId,
      proposerId,
      createdBy: proposerId,
      updatedBy: proposerId,
    });

    const saved = await this.decisionRepository.save(decision);
    this.logger.log(`Decision proposed: ${saved.id} "${saved.title}"`);
    return this.findById(saved.id);
  }

  async findAll(status?: DecisionStatus): Promise<Decision[]> {
    const where = status ? { status } : {};
    return this.decisionRepository.find({
      where,
      relations: ['proposer', 'votes', 'votes.voter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Decision> {
    const decision = await this.decisionRepository.findOne({
      where: { id },
      relations: ['proposer', 'votes', 'votes.voter'],
    });
    if (!decision) {
      throw new ResourceNotFoundException('Decision', id);
    }
    return decision;
  }

  async vote(dto: CastVoteDto, voterId: string): Promise<Vote> {
    const decision = await this.findById(dto.decisionId);

    if (decision.status !== DecisionStatus.PROPOSED) {
      throw new BusinessException(
        'BUS_DECISION_CLOSED',
        `Decision is already ${decision.status.toLowerCase()}`,
      );
    }

    // Check for existing vote — update if exists
    let vote = await this.voteRepository.findOne({
      where: { decisionId: dto.decisionId, voterId },
    });

    if (vote) {
      vote.value = dto.value;
      vote.comment = dto.comment || null;
      vote.updatedBy = voterId;
    } else {
      vote = this.voteRepository.create({
        decisionId: dto.decisionId,
        voterId,
        value: dto.value,
        comment: dto.comment || null,
        createdBy: voterId,
        updatedBy: voterId,
      });
    }

    const saved = await this.voteRepository.save(vote);
    this.logger.log(`Vote cast on decision ${dto.decisionId}: ${dto.value} by ${voterId}`);
    return saved;
  }

  async resolve(id: string, status: DecisionStatus.APPROVED | DecisionStatus.REJECTED, resolvedBy: string): Promise<Decision> {
    const decision = await this.findById(id);

    if (decision.status !== DecisionStatus.PROPOSED) {
      throw new BusinessException(
        'BUS_DECISION_CLOSED',
        `Decision is already ${decision.status.toLowerCase()}`,
      );
    }

    decision.status = status;
    decision.resolvedAt = new Date();
    decision.updatedBy = resolvedBy;

    await this.decisionRepository.save(decision);
    this.logger.log(`Decision ${id} resolved: ${status}`);
    return this.findById(id);
  }
}
