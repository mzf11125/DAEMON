terraform {
  required_version = ">= 1.6.0"

  required_providers {
    # No providers required at the facade level — sub-modules declare their own.
  }
}
