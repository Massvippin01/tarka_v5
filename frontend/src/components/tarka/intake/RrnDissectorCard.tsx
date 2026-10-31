import React from "react";
import { RrnForensicLabCard, type RrnForensicLabCardProps } from "./RrnForensicLabCard";

export type RrnDissectorCardProps = RrnForensicLabCardProps;

export const RrnDissectorCard: React.FC<RrnDissectorCardProps> = (props) => {
  return <RrnForensicLabCard {...props} />;
};

export default RrnDissectorCard;
