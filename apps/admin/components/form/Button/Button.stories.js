import React from 'react';
import Button from ".";

// export default{
// 	title: 'API/Button',
// 	component: Button,
// 	parameters: {
// 		docs: {
// 			description: {
// 				component: 'The API documentation of the Button React component. Learn more about the props and the CSS customization points.',
// 			},
// 		},
// 	}
// };


const Template = (args) => (
	<Button {...args}>
		Submit
	</Button>
);



export const Primary_CTA = Template.bind({});
Primary_CTA.args = {
	title: "Submit Form",
	color: "indigo",
	size: "md",
};

export const Reverse_CTA = Template.bind({});
Reverse_CTA.args = {
	size: "md",
	color: "dove"
};

export const Hollow_CTA = Template.bind({});
Hollow_CTA.args = {
	size: 'md',
	color: "indigo",
	variant: "outline"
};

export const Secondary_CTA = Template.bind({});
Secondary_CTA.args = {
	size: 'md',
	color: "transparent"
};