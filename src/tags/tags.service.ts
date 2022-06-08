import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { CommonService } from '../common/common.service';
import { LocalMessageType } from '../common/gql-types/message.type';
import { TagEntity } from './entities/tag.entity';
import { UpdateTagInput } from './inputs/update-tag.input';

@Injectable()
export class TagsService {
  private readonly tagAlias = 't';

  constructor(
    @InjectRepository(TagEntity)
    private readonly tagsRepository: EntityRepository<TagEntity>,
    private readonly commonService: CommonService,
  ) {}

  /**
   * Create Tag
   *
   * Create CRUD action for Tags.
   */
  public async createTag(userId: number, name: string): Promise<TagEntity> {
    const count = await this.tagsRepository.count({ author: userId });

    if (count === 50)
      throw new BadRequestException('Each user can only have 50 tags');

    name = this.commonService.formatTitle(name);
    const nameCount = await this.tagsRepository.count({ name, author: userId });

    if (nameCount > 0) throw new BadRequestException('Tag already exists');

    const tag = this.tagsRepository.create({
      name,
      author: userId,
    });
    await this.commonService.saveEntity(this.tagsRepository, tag, true);
    return tag;
  }

  /**
   * Update Tag
   *
   * Update CRUD action for Tags.
   */
  public async updateTag(
    userId: number,
    { tagId, name }: UpdateTagInput,
  ): Promise<TagEntity> {
    const tag = await this.tagById(userId, tagId);
    tag.name = this.commonService.formatTitle(name);
    await this.commonService.saveEntity(this.tagsRepository, tag);
    return tag;
  }

  /**
   * Delete Tag
   *
   * Delete CRUD action for Tags.
   */
  public async deleteTag(
    userId: number,
    tagId: number,
  ): Promise<LocalMessageType> {
    const tag = await this.tagById(userId, tagId);
    await this.commonService.removeEntity(this.tagsRepository, tag);
    return new LocalMessageType('Tag deleted successfully');
  }

  /**
   * Find All Tags
   *
   * Read multiple CRUD action for Tags.
   * Finds all tags of the current user.
   */
  public async findAllTags(userId: number): Promise<TagEntity[]> {
    return await this.tagsRepository.find({ author: userId });
  }

  /**
   * Find Tags By Ids
   *
   * Finds tag of the current user by an array of ids.
   */
  public async findTagsByIds(
    userId: number,
    ids: number[],
  ): Promise<TagEntity[]> {
    const tags = await this.tagsRepository.find({
      id: {
        $in: ids,
      },
      author: userId,
    });

    if (tags.length !== ids.length)
      throw new NotFoundException('One or more tags were not found');

    return tags;
  }

  /**
   * Find Tags By Ids Query
   *
   * Find tags by a knex sub query.
   */
  public async findTagsByIdsQuery(
    query: Knex.QueryBuilder,
  ): Promise<TagEntity[]> {
    return await this.tagsRepository
      .createQueryBuilder(this.tagAlias)
      .where({
        id: {
          $in: query,
        },
      })
      .getResult();
  }

  /**
   * Tag By ID
   *
   * Read single CRUD action for Tags.
   */
  public async tagById(userId: number, tagId: number): Promise<TagEntity> {
    const tag = await this.tagsRepository.findOne({
      id: tagId,
      author: userId,
    });
    this.commonService.checkExistence('Tag', tag);
    return tag;
  }

  public async adminEditTag({
    tagId,
    name,
  }: UpdateTagInput): Promise<TagEntity> {
    const tag = await this.tagsRepository.findOne({ id: tagId });
    this.commonService.checkExistence('Tag', tag);
    tag.name = this.commonService.formatTitle(name);
    await this.commonService.saveEntity(this.tagsRepository, tag);
    return tag;
  }
}
