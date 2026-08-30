from .robot_config import Config


class TorqueController:
    """PD + compliance. Unused by the position-mode gait; ST3215 limits applied."""

    def __init__(self):
        self.config = Config

    def compute_torques(self, current_states, target_angles, target_velocities):
        output_torques = []
        for i in range(self.config.NUM_JOINTS):
            state = current_states[i]
            pos_error = target_angles[i] - state.position
            vel_error = target_velocities[i] - state.velocity
            base_torque = (
                self.config.P_POS * pos_error
                - self.config.D_POS * state.velocity
                + self.config.P_VEL * vel_error
            )
            mu = self._calculate_shape_modification_factor(pos_error)
            modified = base_torque * mu
            modified = self._apply_radius_modification(modified, state.load)
            final = max(-self.config.MAX_TORQUE_NM, min(self.config.MAX_TORQUE_NM, modified))
            output_torques.append(final)
        return output_torques

    def _calculate_shape_modification_factor(self, pos_error):
        abs_err = abs(pos_error)
        if abs_err < self.config.POS_ERROR_THRESHOLD:
            return self.config.MU_MAX
        factor = self.config.MU_MAX - (abs_err - self.config.POS_ERROR_THRESHOLD) * 0.5
        return max(self.config.MU_MIN, factor)

    def _apply_radius_modification(self, base_torque, current_load):
        if abs(current_load) > (self.config.MAX_TORQUE_NM * 0.8):
            return base_torque * 0.5
        return base_torque
