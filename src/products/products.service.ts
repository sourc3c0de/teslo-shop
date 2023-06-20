import { BadRequestException, Injectable, 
       InternalServerErrorException, Logger, 
       NotFoundException }  from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository }       from 'typeorm';
import { validate as isUUID } from 'uuid';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product }          from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository( Product )
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create( createProductDto );
      await this.productRepository.save( product );
      return product;
    } catch (error) {
      this.handleDBExceptions( error );
    }
  }

  async findAll( paginationDto: PaginationDto ) {
    const { limit = 10, offset = 0 } = paginationDto;
    return await this.productRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(query: string) {
    let product: Product;

    if ( isUUID( query ) ) {
      product = await this.productRepository.findOneBy({ id: query });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder.where(
        'LOWER(title) =:title or slug =:slug', {
          title: query.toLocaleLowerCase(),
          slug: query.toLocaleLowerCase()
        }
      ).getOne();
    }

    if ( !product ) throw new NotFoundException(`Product with ${ query } not found`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id,
      ...updateProductDto,
    });

    if ( !product ) throw new NotFoundException(`Product with id: ${ id } not found`);

    try {
      return await this.productRepository.save( product );
    } catch (error) {
      this.handleDBExceptions( error );      
    }
  }

  async remove(id: string) {
    const product = await this.findOne( id );
    await this.productRepository.remove( product );
  }

  private handleDBExceptions( error: any ) {

    if ( error.code === '23505' ) throw new BadRequestException( error.detail );

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs.');

  }
}
