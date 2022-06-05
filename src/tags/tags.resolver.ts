import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TagsService } from './tags.service';
import { TagEntity } from './entities/tag.entity';
import { CreateTagDto } from './dtos/create-tag.dto';
import { UpdateTagInput } from './inputs/update-tag.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { TagType } from './gql-types/tag.type';
import { TagDto } from './dtos/tag.dto';
import { UseGuards } from '@nestjs/common';
import { PublisherGuard } from '../auth/guards/publisher.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Resolver(() => TagType)
export class TagsResolver {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(PublisherGuard)
  @Mutation(() => TagType)
  public async createTag(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: CreateTagDto,
  ): Promise<TagEntity> {
    return this.tagsService.createTag(user.id, dto.name);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => TagType)
  public async updateTag(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: UpdateTagInput,
  ) {
    return this.tagsService.updateTag(user.id, dto);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => TagType)
  public async deleteTag(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: TagDto,
  ) {
    return this.tagsService.deletedTag(user.id, dto.tagId);
  }

  @Query(() => [TagType])
  public async findAllTags(@CurrentUser() user: IAccessPayload) {
    return this.tagsService.findAllTags(user.id);
  }

  @Mutation(() => TagType)
  @UseGuards(AdminGuard)
  public async adminEditTag(
    @Args('input') input: UpdateTagInput,
  ): Promise<TagEntity> {
    return this.tagsService.adminEditTag(input);
  }
}
