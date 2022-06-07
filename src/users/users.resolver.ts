import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { GetUserDto } from './dtos/get-user.dto';
import { OnlineStatusDto } from './dtos/online-status.dto';
import { ProfilePictureDto } from './dtos/profile-picture.dto';
import { UserEntity } from './entities/user.entity';
import { PaginatedUsersType } from './gql-types/paginated-users.type';
import { UserType } from './gql-types/user.type';
import { UsersService } from './users.service';
import { PaginatedPostsType } from '../posts/gql-types/paginated-posts.type';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { PaginatedSeriesType } from '../series/gql-types/paginated-series.type';
import { SearchDto } from '../common/dtos/search.dto';
import { UserDto } from './dtos/user.dto';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { RoleEnum } from './enums/role.enum';
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RoleInput } from './inputs/role.input';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  //____________________ MUTATIONS ____________________

  @Mutation(() => UserType)
  public async updateProfilePicture(
    @CurrentUser() userId: number,
    @Args() dto: ProfilePictureDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfilePicture(userId, dto);
  }

  @Mutation(() => LocalMessageType)
  public async updateOnlineStatus(
    @CurrentUser() userId: number,
    @Args() dto: OnlineStatusDto,
  ): Promise<LocalMessageType> {
    return this.usersService.updateDefaultStatus(userId, dto);
  }

  @Mutation(() => LocalMessageType)
  public async deleteAccount(
    @CurrentUser() userId: number,
    @Args('password') password: string,
  ): Promise<LocalMessageType> {
    return this.usersService.deleteUser(userId, password);
  }

  //____________________ QUERIES ____________________

  @Query(() => UserType)
  public async me(@CurrentUser() userId: number): Promise<UserEntity> {
    return this.usersService.userById(userId);
  }

  //____________________ PUBLIC QUERIES ____________________

  @Public()
  @Query(() => UserType)
  public async userByUsername(@Args() dto: GetUserDto): Promise<UserEntity> {
    return this.usersService.userByUsername(dto.username);
  }

  @Public()
  @Query(() => UserType)
  public async userById(@Args() dto: UserDto): Promise<UserEntity> {
    return this.usersService.userById(dto.userId);
  }

  @Public()
  @Query(() => PaginatedUsersType)
  public async filterUsers(
    @Args() dto: SearchDto,
  ): Promise<IPaginated<UserEntity>> {
    return this.usersService.filterUsers(dto);
  }

  //____________________ ADMIN ____________________

  @Mutation(() => UserType)
  @UseGuards(AdminGuard)
  public async adminUpdateUserRole(
    @Args('input') input: RoleInput,
  ): Promise<UserEntity> {
    return this.usersService.adminUpdateUserRole(input);
  }

  @Mutation(() => UserType)
  @UseGuards(AdminGuard)
  public async adminSuspendUser(@Args() dto: UserDto): Promise<UserEntity> {
    return this.usersService.adminSuspendUser(dto.userId);
  }

  @Mutation(() => UserType)
  @UseGuards(AdminGuard)
  public async adminUnsuspendUser(@Args() dto: UserDto): Promise<UserEntity> {
    return this.usersService.adminUnsuspendUser(dto.userId);
  }

  @Mutation(() => UserType)
  @UseGuards(AdminGuard)
  public async adminDeleteUserPicture(
    @Args() dto: UserDto,
  ): Promise<UserEntity> {
    return this.usersService.adminDeleteUserPicture(dto.userId);
  }

  @Mutation(() => LocalMessageType)
  @UseGuards(AdminGuard)
  public async adminDeleteUser(
    @Args() dto: UserDto,
  ): Promise<LocalMessageType> {
    return this.usersService.adminDeleteUser(dto.userId);
  }

  //____________________ RESOLVE FIELDS ____________________

  @ResolveField('email', () => String, { nullable: true })
  public getEmail(
    @Parent() user: UserEntity,
    @CurrentUser() accessUser: IAccessPayload,
  ): string | null {
    return user.id === accessUser.id || accessUser.role === RoleEnum.ADMIN
      ? user.email
      : null;
  }

  // LOADERS

  @ResolveField('likedPosts', () => PaginatedPostsType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getLikedPosts(@Args() _: FilterRelationDto) {
    return;
  }

  @ResolveField('followedSeries', () => PaginatedSeriesType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getFollowedSeries(@Args() _: FilterRelationDto) {
    return;
  }
}
