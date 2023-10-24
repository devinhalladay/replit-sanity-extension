import React from 'react'

const Heading = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-subhead font-medium">{title}</h3>
      {children ? (
        <p className="text-small font-normal text-gray-400">{children}</p>
      ) : null}
    </div>
  );
};

export default Heading;