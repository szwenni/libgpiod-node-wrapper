/**
 * GPIO line direction
 */
export enum Direction {
  /** Line is an input */
  INPUT = 'input',
  /** Line is an output */
  OUTPUT = 'output'
}

/**
 * GPIO line value
 */
export enum Value {
  /** Line is low (0) */
  LOW = 0,
  /** Line is high (1) */
  HIGH = 1
}

/**
 * GPIO line edge detection
 */
export enum Edge {
  /** No edge detection */
  NONE = 'none',
  /** Rising edge detection */
  RISING = 'rising',
  /** Falling edge detection */
  FALLING = 'falling',
  /** Both rising and falling edge detection */
  BOTH = 'both'
}

/**
 * GPIO line drive
 */
export enum Drive {
  /** Push-pull drive */
  PUSH_PULL = 'push_pull',
  /** Open-drain drive */
  OPEN_DRAIN = 'open_drain',
  /** Open-source drive */
  OPEN_SOURCE = 'open_source'
}

/**
 * GPIO line bias
 */
export enum Bias {
  /** No bias */
  DISABLED = 'disabled',
  /** Pull-up bias */
  PULL_UP = 'pull_up',
  /** Pull-down bias */
  PULL_DOWN = 'pull_down'
}

/**
 * GPIO event type
 */
export enum EventType {
  /** Rising edge event */
  RISING_EDGE = 'rising-edge',
  /** Falling edge event */
  FALLING_EDGE = 'falling-edge'
}
