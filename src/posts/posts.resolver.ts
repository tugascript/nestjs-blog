import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { UseGuards } from '@nestjs/common';
import { PublisherGuard } from '../auth/guards/publisher.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { LocalMessageType } from '../common/gql-types/message.type';
import { Public } from '../auth/decorators/public.decorator';
import { SlugDto } from '../common/dtos/slug.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PostType } from './gql-types/post.type';
import { CreatePostInput } from './inputs/create-post.input';
import { UpdatePostInput } from './inputs/update-post.input';
import { PostEntity } from './entities/post.entity';
import { UpdatePostPictureInput } from './inputs/update-post-picture.input';
import { PostTagInput } from './inputs/post-tag.input';
import { PostDto } from './dtos/post.dto';
import { PaginatedPostsType } from './gql-types/paginated-posts.type';
import { SearchPostsDto } from './dtos/search-posts.dto';
import { PaginatedUsersType } from '../users/gql-types/paginated-users.type';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { PubSub } from 'mercurius';
import { FilterSeriesPostDto } from './dtos/filter-series-post.dto';
import { PaginatedCommentsType } from '../comments/gql-types/paginated-comments.type';

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
    @Args() dto: SearchPostsDto,
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
