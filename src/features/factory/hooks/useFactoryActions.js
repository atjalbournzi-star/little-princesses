function useFactoryActions(props) {
  const orderActions = (window.useFactoryOrderActions ? window.useFactoryOrderActions(props) : {});
  const deliveryActions = (window.useFactoryDeliveryActions ? window.useFactoryDeliveryActions({
    ...props,
    advanceToNextStage: orderActions.advanceToNextStage
  }) : {});

  return {
    ...orderActions,
    ...deliveryActions
  };
}

window.useFactoryActions = useFactoryActions;
