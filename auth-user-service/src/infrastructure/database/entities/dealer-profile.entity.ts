import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DealerType = 'INDIVIDUAL' | 'BUSINESS';

/**
 * A reference to one uploaded verification document, stored under a private
 * S3 `dealer-verification/` prefix. An individual dealer uploads an NIC; a
 * business uploads a registration certificate and optionally a signatory
 * NIC — hence a list rather than fixed columns.
 */
export interface VerificationDocument {
  type: 'NIC' | 'BUSINESS_REGISTRATION' | 'SIGNATORY_NIC';
  s3Path: string;
  uploadedAt: string;
}

@Entity({ schema: 'auth', name: 'dealer_profiles' })
export class DealerProfile {
  // user_id is both PK and FK — one profile per user
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.dealerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ name: 'contact_number', type: 'varchar', length: 50, nullable: true })
  contactNumber: string | null;

  /**
   * INDIVIDUAL or BUSINESS. Gates what the dealer may do once verified:
   * a business unlocks bulk CSV/ZIP upload via the Ingest API; an
   * individual is limited to manual listing creation.
   *
   * Nullable because rows created before the verification flow existed
   * have no value. A database CHECK constraint enforces that a BUSINESS
   * must carry a registration number and an INDIVIDUAL must not.
   */
  @Column({ name: 'dealer_type', type: 'varchar', length: 20, nullable: true })
  dealerType: DealerType | null;

  @Column({
    name: 'business_registration_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  businessRegistrationNumber: string | null;

  @Column({ name: 'business_address', type: 'varchar', length: 500, nullable: true })
  businessAddress: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({
    name: 'verification_documents',
    type: 'jsonb',
    default: () => `'[]'::jsonb`,
  })
  verificationDocuments: VerificationDocument[];

  @Column({ name: 'is_verified', type: 'varchar', length: 20, default: 'PENDING' })
  isVerified: VerificationStatus;

  /**
   * The administrator who approved or rejected. SET NULL rather than
   * CASCADE — the decision record must survive that admin's deletion.
   */
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier?: User | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
