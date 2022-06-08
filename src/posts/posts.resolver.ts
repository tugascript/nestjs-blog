import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PublisherGuard } from '../auth/guards/publisher.guard';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { PaginatedCommentsType } from '../comments/gql-types/paginated-comments.type';
import { ExtendedSearchDto } from '../common/dtos/extended-search.dto';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { SlugDto } from '../common/dtos/slug.dto';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { TagEntity } from '../tags/entities/tag.entity';
import { TagType } from '../tags/gql-types/tag.type';
import { UserEntity } from '../users/entities/user.entity';
import { PaginatedUsersType } from '../users/gql-types/paginated-users.type';
import { FilterPostLikesDto } from './dtos/filter-post-likes.dto';
import { FilterSeriesPostDto } from './dtos/filter-series-post.dto';
import { PostDto } from './dtos/post.dto';
import { PostEntity } from './entities/post.entity';
import { PaginatedPostsType } from './gql-types/paginated-posts.type';
import { PostType } from './gql-types/post.type';
import { CreatePostInput } from './inputs/create-post.input';
import { PostTagInput } from './inputs/post-tag.input';
import { UpdatePostPictureInput } from './inputs/update-post-picture.input';
import { UpdatePostInput } from './inputs/update-post.input';
import { PostsService } from './posts.service';

@Resolver(() => PostType)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(PublisherGuard)
  @Mutation(() => PostType)
  public async createPost(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: CreatePostInput,
  ): Promise<PostEntity> {
    return this.postsService.createPost(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => PostType)
  public async updatePost(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: UpdatePostInput,
  ): Promise<PostEntity> {
    return this.postsService.updatePost(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => PostType)
  public async updatePostPicture(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: UpdatePostPictureInput,
  ): Promise<PostEntity> {
    return this.postsService.updatePostPicture(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => PostType)
  public async addTagToPost(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: PostTagInput,
  ): Promise<PostEntity> {
    return this.postsService.addTagToPost(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => PostType)
  public async removeTagFromPost(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: PostTagInput,
  ): Promise<PostEntity> {
    return this.postsService.removeTagFromPost(user.id, input);
  }

  @Mutation(() => PostType)
  public async likePost(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: PostDto,
  ): Promise<PostEntity> {
    return this.postsService.likePost(pubsub, user.id, dto.postId);
  }

  @Mutation(() => PostType)
  public async unlikePost(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: PostDto,
  ): Promise<PostEntity> {
    return this.postsService.unlikePost(pubsub, user.id, dto.postId);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => LocalMessageType)
  public async deletePost(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: PostDto,
  ): Promise<LocalMessageType> {
    return this.postsService.deletePost(user.id, dto.postId);
  }

  @Public()
  @Query(() => PostType)
  public async postById(@Args() dto: PostDto): Promise<PostEntity> {
    return this.postsService.postById(dto.postId);
  }

  @Public()
  @Query(() => PostType)
  public async postBySlug(@Args() dto: SlugDto): Promise<PostEntity> {
    return this.postsService.postBySlug(dto.slug);
  }

  @Public()
  @Query(() => PaginatedPostsType)
  public async filterPost(
    @Args() dto: ExtendedSearchDto,
  ): Promise<IPaginated<PostEntity>> {
    return this.postsService.filterPosts(dto);
  }

  @Public()
  @Query(() => PaginatedPostsType)
  public async filterSeriesPosts(
    @Args() dto: FilterSeriesPostDto,
  ): Promise<IPaginated<PostEntity>> {
    return this.postsService.filterSeriesPosts(dto);
  }

  @Public()
  @Query(() => [TagType])
  public async postTags(@Args() dto: PostDto): Promise<TagEntity[]> {
    return this.postsService.postTags(dto.postId);
  }

  @Public()
  @Query(() => PaginatedUsersType)
  public async postLikes(
    @Args() dto: FilterPostLikesDto,
  ): Promise<IPaginated<UserEntity>> {
    return this.postsService.postLikes(dto);
  }

  //_____ ADMIN _____//

  @Mutation(() => PostType)
  @UseGuards(AdminGuard)
  public async adminEditPost(
    @Args('input') input: UpdatePostInput,
  ): Promise<PostEntity> {
    return this.postsService.adminEditPost(input);
  }

  @Mutation(() => PostType)
  @UseGuards(AdminGuard)
  public async adminEditPostPicture(
    @Args('input') input: UpdatePostPictureInput,
  ): Promise<PostEntity> {
    return this.postsService.adminEditPostPicture(input);
  }

  @Mutation(() => LocalMessageType)
  @UseGuards(AdminGuard)
  public async adminDeletePost(
    @Args() dto: PostDto,
  ): Promise<LocalMessageType> {
    return this.postsService.adminDeletePost(dto.postId);
  }

  //_____ LOADERS _____//

  @ResolveField('likes', () => PaginatedUsersType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getLikes(@Args() _: FilterRelationDto) {
    return;
  }

  @ResolveField('comments', () => PaginatedCommentsType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getComments(@Args() _: FilterRelationDto) {
    return;
  }
}
